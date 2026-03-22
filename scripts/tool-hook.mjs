#!/usr/bin/env node

// Argus Orchestration Tool Hook (cross-platform)
// Captures Agent/Skill/MCP invocations from Claude Code PostToolUse hook.
//
// Hook JSON on stdin:
//   { "session_id": "...", "tool_name": "...", "tool_input": {...}, ... }

import http from 'node:http'
import https from 'node:https'

const ARGUS_ENDPOINT = process.env.ARGUS_ENDPOINT || 'http://localhost:9845'

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve(''))
  })
}

function parseSafe(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function postJSON(urlStr, payload) {
  return new Promise((resolve) => {
    const url = new URL(urlStr)
    const mod = url.protocol === 'https:' ? https : http
    const body = JSON.stringify(payload)

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 2000,
      },
      (res) => {
        res.resume()
        resolve()
      },
    )

    req.on('error', () => resolve())
    req.on('timeout', () => { req.destroy(); resolve() })
    req.write(body)
    req.end()
  })
}

async function main() {
  const raw = await readStdin()
  const hook = parseSafe(raw) || {}

  let toolName = hook.tool_name || process.env.CLAUDE_TOOL_NAME || ''
  if (!toolName) return

  const ALLOWED = /^(Agent|Skill|mcp__)/
  if (!ALLOWED.test(toolName)) return

  const sessionId = hook.session_id || process.env.CLAUDE_SESSION_ID || ''
  const toolInput = hook.tool_input || {}

  let detailName = ''
  let detailType = ''

  if (toolName === 'Agent') {
    const name = toolInput.subagent_type || toolInput.name || toolInput.description || ''
    detailName = typeof name === 'string' ? name.slice(0, 100) : ''
    detailType = 'agent'
  } else if (toolName === 'Skill') {
    detailName = toolInput.skill || toolInput.name || ''
    detailType = 'skill'
  } else if (toolName.startsWith('mcp__')) {
    detailName = toolName
    const mcpServer = toolName.replace(/^mcp__/, '').replace(/__.*$/, '')
    toolName = `mcp:${mcpServer}`
    detailType = 'mcp'
  }

  if (!detailName) return

  let projectName = ''
  const resAttrs = process.env.OTEL_RESOURCE_ATTRIBUTES || ''
  const match = resAttrs.match(/project\.name=([^,]*)/)
  if (match) {
    projectName = match[1]
  }

  const payload = {
    session_id: sessionId,
    tool_name: toolName,
    detail_name: detailName,
    detail_type: detailType,
    project_name: projectName,
    agent_type: 'claude',
  }

  await postJSON(`${ARGUS_ENDPOINT}/api/ingest/tool-detail`, payload)
}

main().catch(() => process.exit(0))
