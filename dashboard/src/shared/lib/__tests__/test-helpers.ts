import Database from 'better-sqlite3'
import { initSchema } from '../db'

export const createTestDb = (): Database.Database => {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}

type ApiRequestOverrides = {
  timestamp?: string
  agent_type?: string
  session_id?: string
  prompt_id?: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  cache_read_tokens?: number
  cache_creation_tokens?: number
  reasoning_tokens?: number
  cost_usd?: number
  duration_ms?: number
  project_name?: string
}

export const insertApiRequest = (db: Database.Database, overrides: ApiRequestOverrides = {}) => {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
      model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name)
    VALUES (?, ?, 'api_request', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', null, ?)
  `).run(
    overrides.timestamp ?? now,
    overrides.agent_type ?? 'claude',
    overrides.session_id ?? 'sess-1',
    overrides.prompt_id ?? '',
    overrides.model ?? 'claude-sonnet-4-6',
    overrides.input_tokens ?? 1000,
    overrides.output_tokens ?? 500,
    overrides.cache_read_tokens ?? 0,
    overrides.cache_creation_tokens ?? 0,
    overrides.reasoning_tokens ?? 0,
    overrides.cost_usd ?? 0.01,
    overrides.duration_ms ?? 1000,
    overrides.project_name ?? '',
  )
}

type ToolResultOverrides = {
  timestamp?: string
  agent_type?: string
  session_id?: string
  prompt_id?: string
  tool_name?: string
  tool_success?: number
  duration_ms?: number
  project_name?: string
}

export const insertToolResult = (db: Database.Database, overrides: ToolResultOverrides = {}) => {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
      model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name)
    VALUES (?, ?, 'tool_result', ?, '', '', 0, 0, 0, 0, 0, 0, ?, ?, ?, ?)
  `).run(
    overrides.timestamp ?? now,
    overrides.agent_type ?? 'claude',
    overrides.session_id ?? 'sess-1',
    overrides.duration_ms ?? 100,
    overrides.tool_name ?? 'bash',
    overrides.tool_success ?? 1,
    overrides.project_name ?? '',
  )
}

type ToolDetailOverrides = {
  timestamp?: string
  session_id?: string
  tool_name?: string
  detail_name?: string
  detail_type?: string
  agent_type?: string
  duration_ms?: number
  success?: number
  project_name?: string
  metadata?: string
}

export const insertToolDetail = (db: Database.Database, overrides: ToolDetailOverrides = {}) => {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO tool_details (timestamp, session_id, tool_name, detail_name, detail_type,
      agent_type, duration_ms, success, project_name, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    overrides.timestamp ?? now,
    overrides.session_id ?? 'sess-1',
    overrides.tool_name ?? 'bash',
    overrides.detail_name ?? 'bash',
    overrides.detail_type ?? 'builtin',
    overrides.agent_type ?? 'claude',
    overrides.duration_ms ?? 100,
    overrides.success ?? 1,
    overrides.project_name ?? '',
    overrides.metadata ?? '{}',
  )
}

export const insertLog = (db: Database.Database, overrides: Partial<{
  timestamp: string
  agent_type: string
  session_id: string
  event_name: string
  prompt_id: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  reasoning_tokens: number
  cost_usd: number
  duration_ms: number
  tool_name: string
  tool_success: number | null
  body: string
  project_name: string
}> = {}) => {
  const defaults = {
    timestamp: new Date().toISOString(),
    agent_type: 'claude',
    session_id: 'test-session',
    event_name: 'api_request',
    prompt_id: '',
    model: 'claude-sonnet-4-20250514',
    input_tokens: 100,
    output_tokens: 50,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
    reasoning_tokens: 0,
    cost_usd: 0.001,
    duration_ms: 500,
    tool_name: '',
    tool_success: null,
    body: '',
    project_name: '',
  }
  const row = { ...defaults, ...overrides }
  db.prepare(`INSERT INTO agent_logs (timestamp, agent_type, session_id, event_name, prompt_id, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, body, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.timestamp, row.agent_type, row.session_id, row.event_name, row.prompt_id,
    row.model, row.input_tokens, row.output_tokens, row.cache_read_tokens,
    row.cache_creation_tokens, row.reasoning_tokens, row.cost_usd, row.duration_ms,
    row.tool_name, row.tool_success, row.body, row.project_name
  )
}
