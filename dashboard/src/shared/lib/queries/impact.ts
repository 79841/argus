import { getDb } from '../db'

export type ImpactMetrics = {
  avg_cost: number
  avg_tokens: number
  cache_rate: number
  tool_success_rate: number
  avg_duration_ms: number
  reqs_per_session: number
  request_count: number
}

export type ImpactCompareResult = {
  before: ImpactMetrics
  after: ImpactMetrics
}

export type DailyMetricPoint = {
  date: string
  avg_cost: number
  avg_tokens: number
  cache_rate: number
}

const emptyMetrics: ImpactMetrics = {
  avg_cost: 0,
  avg_tokens: 0,
  cache_rate: 0,
  tool_success_rate: 0,
  avg_duration_ms: 0,
  reqs_per_session: 0,
  request_count: 0,
}

const getMetricsForPeriod = (from: string, to: string): ImpactMetrics => {
  const db = getDb()

  const apiRow = db.prepare(`
    SELECT
      COALESCE(avg(cost_usd), 0) as avg_cost,
      COALESCE(avg(input_tokens + output_tokens), 0) as avg_tokens,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens)) * 100
        ELSE 0
      END as cache_rate,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms,
      count(*) as request_count
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `).get(from, to) as {
    avg_cost: number
    avg_tokens: number
    cache_rate: number
    avg_duration_ms: number
    request_count: number
  } | undefined

  const toolRow = db.prepare(`
    SELECT
      CASE WHEN count(*) > 0
        THEN CAST(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END) AS REAL) / count(*) * 100
        ELSE 0
      END as tool_success_rate
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `).get(from, to) as { tool_success_rate: number } | undefined

  const sessionRow = db.prepare(`
    SELECT
      CASE WHEN count(DISTINCT session_id) > 0
        THEN CAST(count(*) AS REAL) / count(DISTINCT session_id)
        ELSE 0
      END as reqs_per_session
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND session_id != ''
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `).get(from, to) as { reqs_per_session: number } | undefined

  if (!apiRow) return emptyMetrics

  return {
    avg_cost: apiRow.avg_cost,
    avg_tokens: apiRow.avg_tokens,
    cache_rate: apiRow.cache_rate,
    tool_success_rate: toolRow?.tool_success_rate ?? 0,
    avg_duration_ms: apiRow.avg_duration_ms,
    reqs_per_session: sessionRow?.reqs_per_session ?? 0,
    request_count: apiRow.request_count,
  }
}

export const getImpactCompare = (date: string, days: number = 7): ImpactCompareResult => {
  const changeDate = new Date(date)
  const beforeStart = new Date(changeDate)
  beforeStart.setDate(beforeStart.getDate() - days)
  const afterEnd = new Date(changeDate)
  afterEnd.setDate(afterEnd.getDate() + days)

  const beforeStartStr = beforeStart.toISOString().slice(0, 10)
  const changeDateStr = changeDate.toISOString().slice(0, 10)
  const afterEndStr = afterEnd.toISOString().slice(0, 10)

  return {
    before: getMetricsForPeriod(beforeStartStr, changeDateStr),
    after: getMetricsForPeriod(changeDateStr, afterEndStr),
  }
}

export const getDailyMetrics = (from: string, to: string): DailyMetricPoint[] => {
  const db = getDb()

  const rows = db.prepare(`
    SELECT
      date(timestamp) as date,
      COALESCE(avg(cost_usd), 0) as avg_cost,
      COALESCE(avg(input_tokens + output_tokens), 0) as avg_tokens,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens)) * 100
        ELSE 0
      END as cache_rate
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND date(timestamp) >= date(?) AND date(timestamp) <= date(?)
    GROUP BY date(timestamp)
    ORDER BY date
  `).all(from, to) as DailyMetricPoint[]

  return rows
}
