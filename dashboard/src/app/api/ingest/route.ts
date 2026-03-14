import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  getVal, getAttr, getNumAttr, detectAgentType, normalizeEventName,
  getTokenAttr, getSessionId, normalizeModelId, calculateCost,
  parseTimestamp, attrsToJson, extractMcpServer, getErrorMessage,
  extractProjectFromArgs,
} from '@/lib/ingest-utils'
import type { OtlpLogsRequest } from '@/lib/ingest-utils'

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as OtlpLogsRequest
    if (!data.resourceLogs || !Array.isArray(data.resourceLogs)) {
      return NextResponse.json({ accepted: 0 })
    }
    const db = getDb()

    const insert = db.prepare(`
      INSERT INTO agent_logs (
        timestamp, agent_type, service_name, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, speed, tool_name, tool_success,
        severity_text, body, project_name, resource_attributes, log_attributes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertToolDetail = db.prepare(`
      INSERT INTO tool_details (
        timestamp, session_id, tool_name, detail_name, detail_type,
        duration_ms, success, project_name, metadata, agent_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
    `)

    let count = 0
    const sessionProjects = new Map<string, string>()

    const tx = db.transaction(() => {
      for (const resourceLog of data.resourceLogs ?? []) {
        const resAttrs = resourceLog.resource?.attributes
        const serviceName = getAttr(resAttrs, 'service.name')
        const agentType = detectAgentType(serviceName)
        const projectName = getAttr(resAttrs, 'project.name')

        for (const scopeLog of resourceLog.scopeLogs ?? []) {
          for (const logRecord of scopeLog.logRecords ?? []) {
            const attrs = logRecord.attributes
            const eventName = normalizeEventName(getAttr(attrs, 'event.name'), attrs)
            if (!eventName) continue
            const timestamp = parseTimestamp(logRecord.timeUnixNano || logRecord.observedTimeUnixNano, attrs)
            const sessionId = getSessionId(attrs)
            const inputTokens = getTokenAttr(attrs, 'input_tokens', 'input_token_count')
            const outputTokens = getTokenAttr(attrs, 'output_tokens', 'output_token_count')
            const cacheReadTokens = getTokenAttr(attrs, 'cache_read_tokens', 'cached_token_count') || getNumAttr(attrs, 'cached_content_token_count')
            const cacheCreationTokens = getNumAttr(attrs, 'cache_creation_tokens')
            const reasoningTokens = getNumAttr(attrs, 'reasoning_token_count') || getNumAttr(attrs, 'thoughts_token_count')
            const model = normalizeModelId(getAttr(attrs, 'model'))

            let costUsd = getNumAttr(attrs, 'cost_usd')
            if (costUsd === 0 && agentType !== 'claude' && inputTokens > 0) {
              costUsd = calculateCost(db, model, inputTokens, outputTokens, cacheReadTokens, reasoningTokens)
            }

            // Extract project from Codex tool arguments workdir
            let resolvedProject = projectName
            if (!resolvedProject && agentType === 'codex') {
              resolvedProject = extractProjectFromArgs(attrs)
              if (resolvedProject && sessionId) {
                sessionProjects.set(sessionId, resolvedProject)
              }
              if (!resolvedProject && sessionId) {
                resolvedProject = sessionProjects.get(sessionId) ?? ''
              }
            }

            const toolSuccess = getAttr(attrs, 'success')

            const toolName = getAttr(attrs, 'tool_name') || getAttr(attrs, 'function_name')
            const durationMs = getNumAttr(attrs, 'duration_ms')

            insert.run(
              timestamp,
              agentType,
              serviceName,
              eventName,
              sessionId,
              getAttr(attrs, 'prompt.id') || getAttr(attrs, 'prompt_id'),
              model,
              inputTokens,
              outputTokens,
              cacheReadTokens,
              cacheCreationTokens,
              reasoningTokens,
              costUsd,
              durationMs,
              getAttr(attrs, 'speed') || 'normal',
              toolName,
              toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
              logRecord.severityText ?? 'INFO',
              eventName === 'api_error'
                ? (getErrorMessage(attrs) || (logRecord.body ? getVal(logRecord.body) : ''))
                : (logRecord.body ? getVal(logRecord.body) : ''),
              resolvedProject,
              attrsToJson(resAttrs),
              attrsToJson(attrs)
            )

            // Auto-extract MCP tool details from Claude/Codex/Gemini
            if (agentType === 'claude' && eventName === 'tool_result' && toolName && toolName.startsWith('mcp__')) {
              insertToolDetail.run(
                timestamp, sessionId, `mcp:${extractMcpServer(toolName)}`, toolName, 'mcp',
                durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                resolvedProject, agentType
              )
            }

            if (agentType === 'codex' && eventName === 'tool_result' && toolName && (getAttr(attrs, 'mcp_server') || toolName.startsWith('mcp'))) {
              insertToolDetail.run(
                timestamp, sessionId, `mcp:${extractMcpServer(toolName)}`, toolName, 'mcp',
                durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                resolvedProject, agentType
              )
            }

            if (agentType === 'gemini' && eventName === 'tool_result' && toolName) {
              const toolType = getAttr(attrs, 'tool_type')
              const isMcp = toolType === 'mcp' || toolName.startsWith('mcp')
              if (isMcp) {
                insertToolDetail.run(
                  timestamp, sessionId, `mcp:${extractMcpServer(toolName)}`, toolName, 'mcp',
                  durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                  resolvedProject, agentType
                )
              }

              // Gemini embeds decision in tool_call — emit synthetic tool_decision record
              const decision = getAttr(attrs, 'decision')
              if (decision) {
                insert.run(
                  timestamp, agentType, serviceName, 'tool_decision', sessionId,
                  getAttr(attrs, 'prompt.id') || getAttr(attrs, 'prompt_id'),
                  model, 0, 0, 0, 0, 0, 0, 0, 'normal',
                  toolName, null, 'INFO', decision, resolvedProject,
                  attrsToJson(resAttrs), attrsToJson(attrs)
                )
              }
            }

            count++
          }
        }
      }

      // Backfill project_name for Codex sessions where some events got the project
      if (sessionProjects.size > 0) {
        const backfill = db.prepare(
          "UPDATE agent_logs SET project_name = ? WHERE session_id = ? AND agent_type = 'codex' AND project_name = ''"
        )
        for (const [sid, proj] of sessionProjects) {
          backfill.run(proj, sid)
        }
      }
    })
    tx()

    return NextResponse.json({ accepted: count })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
