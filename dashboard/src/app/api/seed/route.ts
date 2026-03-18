import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-5-20251001',
]

const CODEX_MODELS = [
  'gpt-5.4',
  'gpt-4.1',
  'o4-mini',
]

const GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

const PROJECTS = ['argus', 'web-app', 'api-server', '']

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min: number, max: number) => Math.random() * (max - min) + min
const uuid = () => crypto.randomUUID()
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]

type AgentSeedConfig = {
  agentType: string
  serviceName: string
  models: string[]
  costRange: [number, number]
  toolNames: string[]
  sessionsRange: [number, number]
}

const AGENT_CONFIGS: AgentSeedConfig[] = [
  {
    agentType: 'claude',
    serviceName: 'claude-code',
    models: MODELS,
    costRange: [0.005, 1.5],
    toolNames: ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep'],
    sessionsRange: [3, 6],
  },
  {
    agentType: 'codex',
    serviceName: 'codex_cli_rs',
    models: CODEX_MODELS,
    costRange: [0.002, 0.8],
    toolNames: ['shell', 'read_file', 'write_file', 'patch_file', 'list_directory'],
    sessionsRange: [2, 5],
  },
  {
    agentType: 'gemini',
    serviceName: 'gemini-cli',
    models: GEMINI_MODELS,
    costRange: [0.001, 0.08],
    toolNames: ['shell', 'read_file', 'write_file', 'edit_file', 'glob', 'grep', 'web_search'],
    sessionsRange: [2, 4],
  },
]

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
  const db = getDb()

  const insert = db.prepare(`
    INSERT INTO agent_logs (
      timestamp, agent_type, service_name, event_name, session_id, prompt_id,
      model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      cost_usd, duration_ms, speed, tool_name, project_name, severity_text, body
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INFO', ?)
  `)

  let count = 0

  const insertToolDetail = db.prepare(`
    INSERT INTO tool_details (
      timestamp, session_id, tool_name, detail_name, detail_type,
      duration_ms, success, project_name, metadata, agent_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
  `)

  const ORCHESTRATION_TOOLS = {
    claude: {
      agents: ['general-purpose', 'code-reviewer', 'plan-writer', 'page-builder', 'infra-builder'],
      skills: ['commit', 'review-pr', 'feature-start', 'feature-finish'],
      mcpServers: {
        linear: ['mcp__linear__save_issue', 'mcp__linear__list_issues', 'mcp__linear__get_issue'],
        slack: ['mcp__slack__send_message', 'mcp__slack__list_channels'],
      },
    },
    codex: {
      mcpServers: {
        linear: ['mcp__linear__save_issue', 'mcp__linear__list_issues'],
        github: ['mcp__github__create_pr', 'mcp__github__list_prs'],
      },
    },
    gemini: {
      mcpServers: {
        linear: ['mcp__linear__get_issue', 'mcp__linear__save_comment'],
        supabase: ['mcp__supabase__query', 'mcp__supabase__insert'],
      },
    },
  }

  const tx = db.transaction(() => {
    for (const agentConfig of AGENT_CONFIGS) {
      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const sessionsPerDay = rand(agentConfig.sessionsRange[0], agentConfig.sessionsRange[1])
        for (let s = 0; s < sessionsPerDay; s++) {
          const sessionId = uuid()
          const projectName = pick(PROJECTS)
          const promptsPerSession = rand(5, 15)

          for (let p = 0; p < promptsPerSession; p++) {
            const promptId = uuid()
            const date = new Date()
            date.setDate(date.getDate() - dayOffset)
            date.setHours(rand(8, 22), rand(0, 59), rand(0, 59))
            const ts = date.toISOString()

            // user_prompt event
            insert.run(
              ts, agentConfig.agentType, agentConfig.serviceName, 'user_prompt',
              sessionId, promptId,
              '', 0, 0, 0, 0, 0, 0, 'normal', '', projectName, 'User prompt'
            )
            count++

            // api_request event(s) per prompt
            const apiCalls = rand(1, 3)
            for (let a = 0; a < apiCalls; a++) {
              const model = pick(agentConfig.models)
              const inputTokens = rand(2000, 80000)
              const outputTokens = rand(200, 8000)
              const cacheRead = rand(0, Math.floor(inputTokens * 0.7))
              const cacheCreation = rand(0, 500)
              const cost = randFloat(agentConfig.costRange[0], agentConfig.costRange[1])
              const duration = rand(500, 15000)
              const speed = Math.random() > 0.7 ? 'fast' : 'normal'

              const apiDate = new Date(date.getTime() + rand(1000, 30000))
              insert.run(
                apiDate.toISOString(), agentConfig.agentType, agentConfig.serviceName,
                'api_request', sessionId, promptId, model,
                inputTokens, outputTokens, cacheRead, cacheCreation,
                Math.round(cost * 10000) / 10000, duration, speed, '',
                projectName, 'API response'
              )
              count++
            }

            // tool_result events
            const tools = rand(0, 3)
            for (let t = 0; t < tools; t++) {
              const toolDate = new Date(date.getTime() + rand(30000, 60000))
              const toolName = pick(agentConfig.toolNames)
              insert.run(
                toolDate.toISOString(), agentConfig.agentType, agentConfig.serviceName,
                'tool_result', sessionId, promptId, '', 0, 0, 0, 0, 0,
                rand(50, 5000), 'normal', toolName,
                projectName, `Tool ${toolName} completed`
              )
              count++
            }
          }
        }
      }
    }
    // Seed orchestration tool details
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)

      // Claude: agents, skills, MCPs
      const claudeTools = ORCHESTRATION_TOOLS.claude
      for (let i = 0; i < rand(2, 5); i++) {
        const ts = new Date(date.getTime() + rand(0, 86400000)).toISOString()
        const agentName = pick(claudeTools.agents)
        insertToolDetail.run(ts, uuid(), 'Agent', agentName, 'agent', rand(1000, 30000), 1, pick(PROJECTS), 'claude')
      }
      for (let i = 0; i < rand(1, 3); i++) {
        const ts = new Date(date.getTime() + rand(0, 86400000)).toISOString()
        const skillName = pick(claudeTools.skills)
        insertToolDetail.run(ts, uuid(), 'Skill', skillName, 'skill', rand(500, 5000), 1, pick(PROJECTS), 'claude')
      }
      for (const [server, tools] of Object.entries(claudeTools.mcpServers)) {
        for (let i = 0; i < rand(1, 3); i++) {
          const ts = new Date(date.getTime() + rand(0, 86400000)).toISOString()
          const toolName = pick(tools)
          insertToolDetail.run(ts, uuid(), `mcp:${server}`, toolName, 'mcp', rand(200, 3000), Math.random() > 0.1 ? 1 : 0, pick(PROJECTS), 'claude')
        }
      }

      // Codex: MCPs only
      for (const [server, tools] of Object.entries(ORCHESTRATION_TOOLS.codex.mcpServers)) {
        for (let i = 0; i < rand(0, 2); i++) {
          const ts = new Date(date.getTime() + rand(0, 86400000)).toISOString()
          const toolName = pick(tools)
          insertToolDetail.run(ts, uuid(), `mcp:${server}`, toolName, 'mcp', rand(200, 3000), Math.random() > 0.1 ? 1 : 0, pick(PROJECTS), 'codex')
        }
      }

      // Gemini: MCPs only
      for (const [server, tools] of Object.entries(ORCHESTRATION_TOOLS.gemini.mcpServers)) {
        for (let i = 0; i < rand(0, 2); i++) {
          const ts = new Date(date.getTime() + rand(0, 86400000)).toISOString()
          const toolName = pick(tools)
          insertToolDetail.run(ts, uuid(), `mcp:${server}`, toolName, 'mcp', rand(200, 3000), Math.random() > 0.1 ? 1 : 0, pick(PROJECTS), 'gemini')
        }
      }
    }
  })
  tx()

  return NextResponse.json({ seeded: count })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
