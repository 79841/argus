import type Database from 'better-sqlite3'
import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type SessionRow = {
  session_id: string
  agent_type: string
  model: string
  started_at: string
  last_activity: string
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
  body: string
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
    WITH session_models AS (
      SELECT session_id, GROUP_CONCAT(DISTINCT model) as model
      FROM agent_logs
      WHERE event_name = 'api_request' AND model != ''
      GROUP BY session_id
    )
    SELECT
      agent_logs.session_id,
      agent_logs.agent_type,
      sm.model,
      min(agent_logs.timestamp) as started_at,
      COALESCE(sum(agent_logs.cost_usd), 0) as cost,
      COALESCE(sum(agent_logs.input_tokens), 0) as input_tokens,
      COALESCE(sum(agent_logs.output_tokens), 0) as output_tokens,
      COALESCE(sum(agent_logs.cache_read_tokens), 0) as cache_read_tokens,
      max(agent_logs.timestamp) as last_activity,
      CAST((julianday(max(agent_logs.timestamp)) - julianday(min(agent_logs.timestamp))) * 86400000 AS INTEGER) as duration_ms,
      count(*) as request_count,
      agent_logs.project_name
    FROM agent_logs
    LEFT JOIN session_models sm ON sm.session_id = agent_logs.session_id
    WHERE ${API_REQUEST_FILTER}
      AND agent_logs.session_id != ''
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY agent_logs.session_id, agent_logs.agent_type
    ORDER BY last_activity DESC
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
      tool_success,
      body
    FROM agent_logs
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId) as SessionDetailEvent[]
}

export const getSessionSummary = (sessionId: string, dbOverride?: Database.Database): SessionSummary | null => {
  const db = dbOverride ?? getDb()
  const row = db.prepare(`
    WITH session_models AS (
      SELECT session_id, GROUP_CONCAT(DISTINCT model) as model
      FROM agent_logs
      WHERE session_id = ? AND event_name = 'api_request' AND model != ''
      GROUP BY session_id
    )
    SELECT
      agent_logs.session_id,
      agent_logs.agent_type,
      sm.model,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN cost_usd ELSE 0 END), 0) as total_cost,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN input_tokens ELSE 0 END), 0) as input_tokens,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN output_tokens ELSE 0 END), 0) as output_tokens,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN cache_read_tokens ELSE 0 END), 0) as cache_read_tokens,
      CAST((julianday(max(agent_logs.timestamp)) - julianday(min(agent_logs.timestamp))) * 86400000 AS INTEGER) as duration_ms,
      COALESCE(sum(CASE WHEN event_name = 'api_request' THEN 1 ELSE 0 END), 0) as request_count,
      COALESCE(sum(CASE WHEN event_name = 'tool_result' THEN 1 ELSE 0 END), 0) as tool_count,
      agent_logs.project_name,
      min(agent_logs.timestamp) as started_at
    FROM agent_logs
    LEFT JOIN session_models sm ON sm.session_id = agent_logs.session_id
    WHERE agent_logs.session_id = ?
    GROUP BY agent_logs.session_id, agent_logs.agent_type
  `).get(sessionId, sessionId) as SessionSummary | undefined

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
