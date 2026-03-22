import type Database from 'better-sqlite3'
import { getDb } from '../db'
import { API_REQUEST_FILTER } from './helpers'
import type { SuggestionInput } from '../suggestions'

export type HighCostSession = {
  session_id: string
  agent_type: string
  model: string
  total_cost: number
  request_count: number
  tool_call_count: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  duration_ms: number
  project_name: string
  started_at: string
  causes: string[]
}

type RawHighCostRow = Omit<HighCostSession, 'causes'>

export type ModelCostEfficiency = {
  model: string
  agent_type: string
  request_count: number
  total_cost: number
  avg_cost_per_request: number
  avg_input_tokens: number
  avg_output_tokens: number
  avg_duration_ms: number
  cost_per_1k_tokens: number
}

const EXPENSIVE_MODELS = ['claude-opus-4-6', 'claude-opus-4-20250514', 'o3', 'gpt-5.4']

const tagCauses = (row: RawHighCostRow): string[] => {
  const causes: string[] = []
  if (EXPENSIVE_MODELS.some(m => row.model.includes(m))) causes.push('expensive_model')
  if (row.tool_call_count >= 15) causes.push('many_tool_calls')
  if (row.request_count >= 10) causes.push('many_requests')
  if (row.cache_read_tokens === 0 && row.input_tokens > 10000) causes.push('no_cache')
  return causes
}

export const getHighCostSessions = (days: number = 7, limit: number = 10, dbOverride?: Database.Database): HighCostSession[] => {
  const db = dbOverride ?? getDb()
  const rows = db.prepare(`
    SELECT
      a.session_id,
      a.agent_type,
      (SELECT GROUP_CONCAT(DISTINCT m.model) FROM agent_logs m WHERE m.session_id = a.session_id AND m.event_name = 'api_request' AND m.model != '') as model,
      COALESCE(sum(CASE WHEN a.event_name = 'api_request' THEN a.cost_usd ELSE 0 END), 0) as total_cost,
      COALESCE(sum(CASE WHEN a.event_name = 'api_request' THEN 1 ELSE 0 END), 0) as request_count,
      COALESCE(sum(CASE WHEN a.event_name = 'tool_result' THEN 1 ELSE 0 END), 0) as tool_call_count,
      COALESCE(sum(CASE WHEN a.event_name = 'api_request' THEN a.input_tokens ELSE 0 END), 0) as input_tokens,
      COALESCE(sum(CASE WHEN a.event_name = 'api_request' THEN a.output_tokens ELSE 0 END), 0) as output_tokens,
      COALESCE(sum(CASE WHEN a.event_name = 'api_request' THEN a.cache_read_tokens ELSE 0 END), 0) as cache_read_tokens,
      CAST((julianday(max(a.timestamp)) - julianday(min(a.timestamp))) * 86400000 AS INTEGER) as duration_ms,
      a.project_name,
      min(a.timestamp) as started_at
    FROM agent_logs a
    WHERE a.session_id != ''
      AND a.timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY a.session_id, a.agent_type
    HAVING total_cost > 0
    ORDER BY total_cost DESC
    LIMIT ?
  `).all(days, limit) as RawHighCostRow[]

  return rows.map(row => ({
    ...row,
    model: row.model || '',
    causes: tagCauses(row),
  }))
}

export const getModelCostEfficiency = (days: number = 7, dbOverride?: Database.Database): ModelCostEfficiency[] => {
  const db = dbOverride ?? getDb()
  return db.prepare(`
    SELECT
      model,
      agent_type,
      count(*) as request_count,
      COALESCE(sum(cost_usd), 0) as total_cost,
      COALESCE(avg(cost_usd), 0) as avg_cost_per_request,
      COALESCE(avg(input_tokens), 0) as avg_input_tokens,
      COALESCE(avg(output_tokens), 0) as avg_output_tokens,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms,
      CASE
        WHEN avg(input_tokens + output_tokens) > 0
        THEN (avg(cost_usd) / avg(input_tokens + output_tokens)) * 1000
        ELSE 0
      END as cost_per_1k_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND model != ''
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY model, agent_type
    ORDER BY total_cost DESC
  `).all(days) as ModelCostEfficiency[]
}

const EXPENSIVE_MODEL_PATTERNS = ['opus', 'o3', 'gpt-5']

const isExpensiveModel = (model: string): boolean =>
  EXPENSIVE_MODEL_PATTERNS.some(p => model.toLowerCase().includes(p))

export const getSuggestionMetrics = (
  days: number,
  dbOverride?: Database.Database
): SuggestionInput => {
  const db = dbOverride ?? getDb()

  const cacheRow = db.prepare(`
    SELECT
      COALESCE(sum(cache_read_tokens), 0) as total_cache_read,
      COALESCE(sum(input_tokens), 0) as total_input
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND timestamp >= datetime('now', '-' || ? || ' days')
  `).get(days) as { total_cache_read: number; total_input: number } | undefined

  const totalCacheRead = cacheRow?.total_cache_read ?? 0
  const totalInput = cacheRow?.total_input ?? 0
  const overallCacheRate = (totalInput + totalCacheRead) > 0
    ? totalCacheRead / (totalInput + totalCacheRead)
    : 0

  const sessionCostRows = db.prepare(`
    SELECT
      session_id,
      COALESCE(sum(cost_usd), 0) as session_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND session_id != ''
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY session_id
  `).all(days) as Array<{ session_id: string; session_cost: number }>

  const avgCostPerSession = sessionCostRows.length > 0
    ? sessionCostRows.reduce((s, r) => s + r.session_cost, 0) / sessionCostRows.length
    : 0

  const modelRows = db.prepare(`
    SELECT
      model,
      count(*) as cnt
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND model != ''
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY model
  `).all(days) as Array<{ model: string; cnt: number }>

  const totalRequests = modelRows.reduce((s, r) => s + r.cnt, 0)
  const expensiveCount = modelRows
    .filter(r => isExpensiveModel(r.model))
    .reduce((s, r) => s + r.cnt, 0)
  const expensiveModelRatio = totalRequests > 0 ? expensiveCount / totalRequests : 0

  const toolRow = db.prepare(`
    SELECT
      count(*) as total,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND timestamp >= datetime('now', '-' || ? || ' days')
  `).get(days) as { total: number; fail_count: number } | undefined

  const toolFailRate = (toolRow?.total ?? 0) > 0
    ? (toolRow?.fail_count ?? 0) / toolRow!.total
    : 0

  const topFailingToolRows = db.prepare(`
    SELECT
      tool_name,
      count(*) as total,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND tool_name != ''
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY tool_name
    HAVING total >= 3
    ORDER BY (CAST(fail_count AS REAL) / total) DESC
    LIMIT 5
  `).all(days) as Array<{ tool_name: string; total: number; fail_count: number }>

  const topFailingTools = topFailingToolRows.map(r => ({
    name: r.tool_name,
    failRate: r.total > 0 ? r.fail_count / r.total : 0,
  }))

  const dailyCostRow = db.prepare(`
    SELECT COALESCE(sum(cost_usd), 0) as daily_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) = date('now')
  `).get() as { daily_cost: number } | undefined

  const totalDailyCost = dailyCostRow?.daily_cost ?? 0

  const modelBreakdownRows = db.prepare(`
    SELECT
      model,
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND model != ''
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY model
    ORDER BY cost DESC
    LIMIT 10
  `).all(days) as Array<{ model: string; cost: number }>

  const totalCost = modelBreakdownRows.reduce((s, r) => s + r.cost, 0)
  const modelUsageBreakdown = modelBreakdownRows.map(r => ({
    model: r.model,
    cost: r.cost,
    ratio: totalCost > 0 ? r.cost / totalCost : 0,
  }))

  const avgDurationRow = db.prepare(`
    SELECT COALESCE(avg(session_duration), 0) as avg_ms
    FROM (
      SELECT
        session_id,
        CAST((julianday(max(timestamp)) - julianday(min(timestamp))) * 86400000 AS INTEGER) as session_duration
      FROM agent_logs
      WHERE ${API_REQUEST_FILTER}
        AND session_id != ''
        AND timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY session_id
    )
  `).get(days) as { avg_ms: number } | undefined

  return {
    overallCacheRate,
    avgCostPerSession,
    expensiveModelRatio,
    toolFailRate,
    avgSessionDurationMs: avgDurationRow?.avg_ms ?? 0,
    totalDailyCost,
    topFailingTools,
    modelUsageBreakdown,
  }
}
