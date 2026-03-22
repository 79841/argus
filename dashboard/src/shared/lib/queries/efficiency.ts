import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type EfficiencyRow = {
  agent_type: string
  date: string
  total_input: number
  total_output: number
  total_requests: number
  total_cache_read: number
  cache_hit_rate: number
  cost: number
  total_duration_ms: number
}

export type EfficiencyComparisonRow = {
  agent_type: string
  total_input: number
  total_output: number
  total_requests: number
  total_cache_read: number
  cost: number
  total_duration_ms: number
}

export const getEfficiencyStats = (agentType: string = 'all', days: number = 7, project: string = 'all', from?: string, to?: string): EfficiencyRow[] => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    SELECT
      agent_type,
      date(timestamp) as date,
      COALESCE(sum(input_tokens), 0) as total_input,
      COALESCE(sum(output_tokens), 0) as total_output,
      count(*) as total_requests,
      COALESCE(sum(cache_read_tokens), 0) as total_cache_read,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_hit_rate,
      COALESCE(sum(cost_usd), 0) as cost,
      COALESCE(sum(duration_ms), 0) as total_duration_ms
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY agent_type, date
    ORDER BY date ASC
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as EfficiencyRow[]
}

export const getEfficiencyComparison = (agentType: string = 'all', days: number = 7, project: string = 'all', from?: string, to?: string): {
  current: EfficiencyComparisonRow[]
  previous: EfficiencyComparisonRow[]
} => {
  const db = getDb()

  if (from && to) {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(fromDate)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - rangeDays + 1)
    const prevFromISO = prevFrom.toISOString().slice(0, 10)
    const prevToISO = prevTo.toISOString().slice(0, 10)

    const query = `
      SELECT
        agent_type,
        COALESCE(sum(input_tokens), 0) as total_input,
        COALESCE(sum(output_tokens), 0) as total_output,
        count(*) as total_requests,
        COALESCE(sum(cache_read_tokens), 0) as total_cache_read,
        COALESCE(sum(cost_usd), 0) as cost,
        COALESCE(sum(duration_ms), 0) as total_duration_ms
      FROM agent_logs
      WHERE ${API_REQUEST_FILTER}
        ${dateRangeFilter()}
        ${agentFilter(agentType)}
        ${projectFilter(project)}
      GROUP BY agent_type
    `
    const current = db.prepare(query).all(from, to, ...agentParams(agentType), ...projectParams(project)) as EfficiencyComparisonRow[]
    const previous = db.prepare(query).all(prevFromISO, prevToISO, ...agentParams(agentType), ...projectParams(project)) as EfficiencyComparisonRow[]
    return { current, previous }
  }

  const query = `
    SELECT
      agent_type,
      COALESCE(sum(input_tokens), 0) as total_input,
      COALESCE(sum(output_tokens), 0) as total_output,
      count(*) as total_requests,
      COALESCE(sum(cache_read_tokens), 0) as total_cache_read,
      COALESCE(sum(cost_usd), 0) as cost,
      COALESCE(sum(duration_ms), 0) as total_duration_ms
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) >= date('now', '-' || ? || ' days')
      AND date(timestamp) < date('now', '-' || ? || ' days')
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY agent_type
  `
  const current = db.prepare(query).all(days, 0, ...agentParams(agentType), ...projectParams(project)) as EfficiencyComparisonRow[]
  const previous = db.prepare(query).all(days * 2, days, ...agentParams(agentType), ...projectParams(project)) as EfficiencyComparisonRow[]
  return { current, previous }
}
