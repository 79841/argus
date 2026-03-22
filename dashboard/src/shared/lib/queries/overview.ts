import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type OverviewStats = {
  total_sessions: number
  total_cost: number
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_tokens: number
  cache_hit_rate: number
}

export type OverviewDelta = {
  cost_delta_pct: number | null
  sessions_delta_pct: number | null
  requests_delta_pct: number | null
  cache_rate_delta_pct: number | null
}

export type AgentTodaySummary = {
  agent_type: string
  today_cost: number
  today_requests: number
  last_active: string | null
}

export type AllTimeStats = {
  total_cost: number
  total_tokens: number
}

export type ActiveSession = {
  session_id: string
  agent_type: string
  model: string
  last_event: string
  cost: number
  event_count: number
}

export type AgentDailyCost = {
  agent_type: string
  daily_cost: number
}

export type IngestStatusRow = {
  agent_type: string
  last_received: string
  today_count: number
  total_count: number
}

export const getOverviewStats = (agentType: string, project: string = 'all', from?: string, to?: string): OverviewStats => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) = date('now')"
  const dateParams = useDate ? [from, to] : []

  const row = db.prepare(`
    SELECT
      count(DISTINCT session_id) as total_sessions,
      count(*) as total_requests,
      COALESCE(sum(cost_usd), 0) as total_cost,
      COALESCE(sum(input_tokens), 0) as total_input_tokens,
      COALESCE(sum(output_tokens), 0) as total_output_tokens,
      COALESCE(sum(cache_read_tokens), 0) as total_cache_read_tokens,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_hit_rate
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
  `).get(...dateParams, ...agentParams(agentType), ...projectParams(project)) as OverviewStats | undefined

  return row ?? { total_sessions: 0, total_cost: 0, total_requests: 0, total_input_tokens: 0, total_output_tokens: 0, total_cache_read_tokens: 0, cache_hit_rate: 0 }
}

export const getOverviewDelta = (agentType: string, project: string = 'all'): OverviewDelta => {
  const db = getDb()

  const query = `
    SELECT
      count(DISTINCT session_id) as total_sessions,
      count(*) as total_requests,
      COALESCE(sum(cost_usd), 0) as total_cost,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_hit_rate
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) = date('now', ?)
      ${agentFilter(agentType)}
      ${projectFilter(project)}
  `

  type DayRow = { total_sessions: number; total_requests: number; total_cost: number; cache_hit_rate: number }
  const stmt = db.prepare(query)
  const params = [...agentParams(agentType), ...projectParams(project)]
  const today = stmt.get('0 days', ...params) as DayRow | undefined
  const yesterday = stmt.get('-1 day', ...params) as DayRow | undefined

  const calcDelta = (curr: number, prev: number): number | null => {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  return {
    cost_delta_pct: calcDelta(today?.total_cost ?? 0, yesterday?.total_cost ?? 0),
    sessions_delta_pct: calcDelta(today?.total_sessions ?? 0, yesterday?.total_sessions ?? 0),
    requests_delta_pct: calcDelta(today?.total_requests ?? 0, yesterday?.total_requests ?? 0),
    cache_rate_delta_pct: calcDelta(today?.cache_hit_rate ?? 0, yesterday?.cache_hit_rate ?? 0),
  }
}

export const getAgentTodaySummaries = (): AgentTodaySummary[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      agent_type,
      COALESCE(sum(cost_usd), 0) as today_cost,
      count(*) as today_requests,
      max(timestamp) as last_active
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) = date('now')
      AND agent_type IN ('claude', 'codex', 'gemini')
    GROUP BY agent_type
  `).all() as AgentTodaySummary[]
}

export const getAllTimeStats = (agentType: string, project: string = 'all'): AllTimeStats => {
  const db = getDb()
  const row = db.prepare(`
    SELECT
      COALESCE(sum(cost_usd), 0) as total_cost,
      COALESCE(sum(input_tokens + output_tokens + cache_read_tokens), 0) as total_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
  `).get(...agentParams(agentType), ...projectParams(project)) as AllTimeStats | undefined

  return row ?? { total_cost: 0, total_tokens: 0 }
}

export const getActiveSessions = (): ActiveSession[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      session_id,
      agent_type,
      (SELECT m.model FROM agent_logs m WHERE m.session_id = agent_logs.session_id AND m.event_name = 'api_request' AND m.model != '' GROUP BY m.model ORDER BY count(*) DESC LIMIT 1) as model,
      max(timestamp) as last_event,
      COALESCE(sum(cost_usd), 0) as cost,
      count(*) as event_count
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND timestamp > datetime('now', '-5 minutes')
      AND session_id != ''
    GROUP BY session_id, agent_type
    ORDER BY last_event DESC
  `).all() as ActiveSession[]
}

export const getAgentDailyCosts = (): AgentDailyCost[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      agent_type,
      COALESCE(sum(cost_usd), 0) as daily_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) = date('now')
    GROUP BY agent_type
  `).all() as AgentDailyCost[]
}

export type AgentDistribution = {
  agent_type: string
  sessions: number
  tokens: number
  cost: number
}

export const getAgentDistribution = (from?: string, to?: string): AgentDistribution[] => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) = date('now')"
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      agent_type,
      count(DISTINCT session_id) as sessions,
      COALESCE(sum(input_tokens + output_tokens), 0) as tokens,
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${dateClause}
      AND agent_type IN ('claude', 'codex', 'gemini')
    GROUP BY agent_type
    ORDER BY cost DESC
  `).all(...dateParams) as AgentDistribution[]
}

export const getIngestStatus = (): IngestStatusRow[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      agent_type,
      max(timestamp) as last_received,
      sum(CASE WHEN date(timestamp) = date('now') THEN 1 ELSE 0 END) as today_count,
      count(*) as total_count
    FROM agent_logs
    GROUP BY agent_type
    ORDER BY last_received DESC
  `).all() as IngestStatusRow[]
}
