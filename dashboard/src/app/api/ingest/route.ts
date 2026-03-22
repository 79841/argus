import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { serverError } from '@/shared/lib/api-utils'
import {
  getVal, getAttr, getNumAttr, detectAgentType, normalizeEventName,
  getTokenAttr, getSessionId, normalizeModelId, calculateCost,
  parseTimestamp, attrsToJson, extractMcpServer, getErrorMessage,
  extractProjectFromArgs,
} from '@/shared/lib/ingest-utils'
import type { OtlpLogsRequest } from '@/shared/lib/ingest-utils'

export async function POST(request: NextRequest) {
  let data: OtlpLogsRequest
  try {
    data = (await request.json()) as OtlpLogsRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  try {
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
    const codexSessions = new Set<string>()

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

            const rawBody = logRecord.body ? getVal(logRecord.body) : ''
            let body = rawBody
            if (eventName === 'api_error') {
              body = getErrorMessage(attrs) || body
            } else if (eventName === 'user_prompt') {
              const promptText = getAttr(attrs, 'prompt')
              if (promptText && !['<REDACTED>', '[REDACTED]'].includes(promptText)) {
                body = promptText
              } else if (!body || body.endsWith(`.${eventName}`) || ['<REDACTED>', '[REDACTED]'].includes(body)) {
                body = ''
              }
            }

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
              body,
              resolvedProject,
              attrsToJson(resAttrs),
              attrsToJson(attrs)
            )


            // Auto-extract orchestration tool details from Claude Code
            if (agentType === 'claude' && eventName === 'tool_result' && toolName) {
              const toolParams = getAttr(attrs, 'tool_parameters')
              let params: Record<string, string> = {}
              if (toolParams) {
                try {
                  params = JSON.parse(toolParams)
                } catch (error) {
                  console.warn('[ingest] Failed to parse tool_parameters:', toolParams?.slice(0, 200), error)
                }
              }

              if (toolName.startsWith('mcp__') || (toolName === 'mcp_tool' && params.mcp_server_name)) {
                const mcpServer = params.mcp_server_name || extractMcpServer(toolName)
                const mcpTool = params.mcp_tool_name || toolName
                const detailName = toolName.startsWith('mcp__') ? toolName : `mcp__${mcpServer}__${mcpTool}`
                insertToolDetail.run(
                  timestamp, sessionId, `mcp:${mcpServer}`, detailName, 'mcp',
                  durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                  resolvedProject, agentType
                )
              } else if (toolName === 'Skill' && params.skill_name) {
                insertToolDetail.run(
                  timestamp, sessionId, 'Skill', params.skill_name, 'skill',
                  durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                  resolvedProject, agentType
                )
              } else if (toolName === 'Agent') {
                const detailName = params.subagent_type || params.name || params.description || ''
                if (detailName) {
                  insertToolDetail.run(
                    timestamp, sessionId, 'Agent', detailName, 'agent',
                    durationMs, toolSuccess === '' ? null : toolSuccess === 'true' ? 1 : 0,
                    resolvedProject, agentType
                  )
                }
              }
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

            if (agentType === 'codex' && sessionId) {
              codexSessions.add(sessionId)
            }

            count++
          }
        }
      }

      // Backfill synthetic prompt_id for Codex sessions (Codex has no native prompt_id)
      if (codexSessions.size > 0) {
        const selectEvents = db.prepare(
          "SELECT id, event_name, prompt_id FROM agent_logs WHERE session_id = ? AND agent_type = 'codex' ORDER BY timestamp, id"
        )
        const updatePromptId = db.prepare(
          'UPDATE agent_logs SET prompt_id = ? WHERE id = ?'
        )
        for (const sid of codexSessions) {
          const rows = selectEvents.all(sid) as { id: number; event_name: string; prompt_id: string }[]
          let currentPromptId = ''
          for (const row of rows) {
            if (row.prompt_id) {
              currentPromptId = row.prompt_id
              continue
            }
            if (row.event_name === 'user_prompt') {
              currentPromptId = randomUUID()
            } else if (!currentPromptId && row.event_name !== 'session_start') {
              currentPromptId = randomUUID()
            }
            if (currentPromptId) {
              updatePromptId.run(currentPromptId, row.id)
            }
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
    return serverError('/api/ingest', error)
  }
}
