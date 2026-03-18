import type Database from 'better-sqlite3'
import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type SessionRow = {
  session_id: string
  agent_type: string
  model: string
  started_at: string
  cost: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  duration_ms: number
  request_count: number
  project_name: string
}

export type SessionDetailEvent = {
  timestamp: string
  event_name: string
  prompt_id: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cost_usd: number
  duration_ms: number
  tool_name: string
  tool_success: number | null
}

export type SessionSummary = {
  session_id: string
  agent_type: string
  model: string
  total_cost: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  duration_ms: number
  request_count: number
  tool_count: number
  project_name: string
  started_at: string
}

export type ModelUsage = {
  model: string
  agent_type: string
  request_count: number
  cost: number
}

export const getSessions = (agentType: string, project: string = 'all', from?: string, to?: string, limit: number = 100): SessionRow[] => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : ''
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      session_id,
      agent_type,
      (SELECT GROUP_CONCAT(DISTINCT m.model) FROM agent_logs m WHERE m.session_id = agent_logs.session_id AND m.event_name = 'api_request' AND m.model != '') as model,
      min(timestamp) as started_at,
      COALESCE(sum(cost_usd), 0) as cost,
      COALESCE(sum(input_tokens), 0) as input_tokens,
      COALESCE(sum(output_tokens), 0) as output_tokens,
      COALESCE(sum(cache_read_tokens), 0) as cache_read_tokens,
      CAST((julianday(max(timestamp)) - julianday(min(timestamp))) * 86400000 AS INTEGER) as duration_ms,
      count(*) as request_count,
      project_name
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND session_id != ''
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY session_id, agent_type
    ORDER BY started_at DESC
    LIMIT ?
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project), limit) as SessionRow[]
}

export const getSessionDetail = (sessionId: string, dbOverride?: Database.Database): SessionDetailEvent[] => {
  const db = dbOverride ?? getDb()
  return db.prepare(`
    SELECT
      timestamp,
      event_name,
      prompt_id,
      model,
      input_tokens,
      output_tokens,
      cache_read_tokens,
      cost_usd,
      duration_ms,
      tool_name,
      tool_success
    FROM agent_logs
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId) as SessionDetailEvent[]
}

export const getSessionSummary = (sessionId: string, dbOverride?: Database.Database): SessionSummary | null => {
  const db = dbOverride ?? getDb()
  const row = db.prepare(`
    SELECT
      session_id,
      agent_type,
      (SELECT GROUP_CONCAT(DISTINCT m.model) FROM agent_logs m WHERE m.session_id = agent_logs.session_id AND m.event_name = 'api_request' AND m.model != '') as model,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN cost_usd ELSE 0 END), 0) as total_cost,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN input_tokens ELSE 0 END), 0) as input_tokens,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN output_tokens ELSE 0 END), 0) as output_tokens,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN cache_read_tokens ELSE 0 END), 0) as cache_read_tokens,
      CAST((julianday(max(timestamp)) - julianday(min(timestamp))) * 86400000 AS INTEGER) as duration_ms,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN 1 ELSE 0 END), 0) as request_count,
      COALESCE(sum(CASE WHEN event_name = 'tool_result' THEN 1 ELSE 0 END), 0) as tool_count,
      project_name,
      min(timestamp) as started_at
    FROM agent_logs
    WHERE session_id = ?
    GROUP BY session_id, agent_type
  `).get(sessionId) as SessionSummary | undefined

  return row ?? null
}

export const getModelUsage = (agentType: string, project: string = 'all', from?: string, to?: string): ModelUsage[] => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : ''
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      model,
      agent_type,
      count(*) as request_count,
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND model != ''
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY model, agent_type
    ORDER BY request_count DESC
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as ModelUsage[]
}
