import { getDb } from './db'

/**
 * Query functions for Argus dashboard.
 * Filters on event_name = 'api_request' for token/cost metrics.
 */

const API_REQUEST_FILTER = "event_name = 'api_request'"

const agentFilter = (agentType: string) =>
  agentType !== 'all' ? `AND agent_type = ?` : ''

const agentParams = (agentType: string) =>
  agentType !== 'all' ? [agentType] : []

const projectFilter = (project: string) =>
  project !== 'all' ? `AND project_name = ?` : ''

const projectParams = (project: string) =>
  project !== 'all' ? [project] : []

const dateRangeFilter = () =>
  `AND date(timestamp) >= date(?) AND date(timestamp) <= date(?)`

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

export const getOverviewStats = async (agentType: string, project: string = 'all', from?: string, to?: string): Promise<OverviewStats> => {
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

export const getOverviewDelta = async (agentType: string, project: string = 'all'): Promise<OverviewDelta> => {
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

  const today = db.prepare(query).get('0 days', ...agentParams(agentType), ...projectParams(project)) as { total_sessions: number; total_requests: number; total_cost: number; cache_hit_rate: number } | undefined
  const yesterday = db.prepare(query).get('-1 day', ...agentParams(agentType), ...projectParams(project)) as { total_sessions: number; total_requests: number; total_cost: number; cache_hit_rate: number } | undefined

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

export type AgentTodaySummary = {
  agent_type: string
  today_cost: number
  today_requests: number
  last_active: string | null
}

export const getAgentTodaySummaries = async (): Promise<AgentTodaySummary[]> => {
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

export type AllTimeStats = {
  total_cost: number
  total_tokens: number
}

export const getAllTimeStats = async (agentType: string, project: string = 'all'): Promise<AllTimeStats> => {
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

export type DailyStats = {
  date: string
  sessions: number
  cost: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  agent_type: string
}

export const getDailyStats = async (agentType: string, days: number = 30, project: string = 'all', from?: string, to?: string): Promise<DailyStats[]> => {
  const db = getDb()
  const agentSelect = agentType === 'all' ? 'agent_type' : `'${agentType}' as agent_type`
  const agentGroupBy = agentType === 'all' ? ', agent_type' : ''
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    SELECT
      date(timestamp) as date,
      ${agentSelect},
      count(DISTINCT session_id) as sessions,
      COALESCE(sum(cost_usd), 0) as cost,
      COALESCE(sum(input_tokens), 0) as input_tokens,
      COALESCE(sum(output_tokens), 0) as output_tokens,
      COALESCE(sum(cache_read_tokens), 0) as cache_read_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY date${agentGroupBy}
    ORDER BY date ASC
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as DailyStats[]
}

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

export const getSessions = async (agentType: string, project: string = 'all', from?: string, to?: string, limit: number = 100): Promise<SessionRow[]> => {
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

export type ModelUsage = {
  model: string
  agent_type: string
  request_count: number
  cost: number
}

export const getModelUsage = async (agentType: string, project: string = 'all', from?: string, to?: string): Promise<ModelUsage[]> => {
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

export const getEfficiencyStats = async (days: number = 7, project: string = 'all', from?: string, to?: string): Promise<EfficiencyRow[]> => {
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
      ${projectFilter(project)}
    GROUP BY agent_type, date
    ORDER BY date ASC
  `).all(...dateParams, ...projectParams(project)) as EfficiencyRow[]
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

export const getEfficiencyComparison = async (days: number = 7, project: string = 'all', from?: string, to?: string): Promise<{
  current: EfficiencyComparisonRow[]
  previous: EfficiencyComparisonRow[]
}> => {
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
        ${projectFilter(project)}
      GROUP BY agent_type
    `
    const current = db.prepare(query).all(from, to, ...projectParams(project)) as EfficiencyComparisonRow[]
    const previous = db.prepare(query).all(prevFromISO, prevToISO, ...projectParams(project)) as EfficiencyComparisonRow[]
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
      ${projectFilter(project)}
    GROUP BY agent_type
  `
  const current = db.prepare(query).all(days, 0, ...projectParams(project)) as EfficiencyComparisonRow[]
  const previous = db.prepare(query).all(days * 2, days, ...projectParams(project)) as EfficiencyComparisonRow[]
  return { current, previous }
}

export type ProjectRow = {
  project_name: string
  session_count: number
  total_cost: number
}

export type ToolUsageRow = {
  tool_name: string
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
}

export const getToolUsageStats = async (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): Promise<ToolUsageRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    SELECT
      tool_name,
      count(*) as invocation_count,
      COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms
    FROM agent_logs
    WHERE event_name = 'tool_result'
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY tool_name
    ORDER BY invocation_count DESC
    LIMIT 30
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as ToolUsageRow[]
}

export type DailyToolRow = {
  date: string
  tool_name: string
  count: number
}

export const getDailyToolStats = async (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): Promise<DailyToolRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    SELECT
      date(timestamp) as date,
      tool_name,
      count(*) as count
    FROM agent_logs
    WHERE event_name = 'tool_result'
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY date(timestamp), tool_name
    ORDER BY date ASC, count DESC
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as DailyToolRow[]
}

export type ToolDetailRow = {
  tool_name: string
  category: string
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
  total_duration_ms: number
  prompt_count: number
  total_tokens: number
  total_cost: number
}

export const getToolDetailStats = async (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): Promise<ToolDetailRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    WITH tool_prompts AS (
      SELECT
        tool_name,
        prompt_id,
        count(*) as invocation_count,
        COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
        COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
        COALESCE(sum(duration_ms), 0) as total_duration_ms,
        COALESCE(avg(duration_ms), 0) as avg_duration_ms
      FROM agent_logs
      WHERE event_name = 'tool_result'
        AND tool_name != ''
        ${dateClause}
        ${agentFilter(agentType)}
        ${projectFilter(project)}
      GROUP BY tool_name, prompt_id
    ),
    prompt_tokens AS (
      SELECT
        prompt_id,
        COALESCE(sum(input_tokens + output_tokens + cache_read_tokens), 0) as tokens,
        COALESCE(sum(cost_usd), 0) as cost
      FROM agent_logs
      WHERE event_name = 'api_request'
        ${dateClause}
        ${agentFilter(agentType)}
        ${projectFilter(project)}
      GROUP BY prompt_id
    )
    SELECT
      tp.tool_name,
      CASE
        WHEN tp.tool_name LIKE 'mcp%' THEN 'MCP'
        WHEN tp.tool_name IN ('Agent', 'Skill') THEN 'Orchestration'
        ELSE 'Built-in'
      END as category,
      sum(tp.invocation_count) as invocation_count,
      sum(tp.success_count) as success_count,
      sum(tp.fail_count) as fail_count,
      avg(tp.avg_duration_ms) as avg_duration_ms,
      sum(tp.total_duration_ms) as total_duration_ms,
      count(DISTINCT tp.prompt_id) as prompt_count,
      COALESCE(sum(pt.tokens), 0) as total_tokens,
      COALESCE(sum(pt.cost), 0) as total_cost
    FROM tool_prompts tp
    LEFT JOIN prompt_tokens pt ON tp.prompt_id = pt.prompt_id AND tp.prompt_id != ''
    GROUP BY tp.tool_name
    ORDER BY invocation_count DESC
  `).all(
    ...dateParams, ...agentParams(agentType), ...projectParams(project),
    ...dateParams, ...agentParams(agentType), ...projectParams(project)
  ) as ToolDetailRow[]
}

export type IndividualToolRow = {
  tool_name: string
  detail_name: string
  detail_type: string
  agent_type: string
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
  last_used: string
}

export const getIndividualToolStats = async (days: number = 30, project: string = 'all', from?: string, to?: string): Promise<IndividualToolRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate
    ? `AND date(timestamp) >= date(?) AND date(timestamp) <= date(?)`
    : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  return db.prepare(`
    SELECT
      tool_name,
      CASE
        WHEN detail_type = 'mcp' THEN replace(tool_name, 'mcp:', '')
        ELSE detail_name
      END as detail_name,
      detail_type,
      agent_type,
      count(*) as invocation_count,
      COALESCE(sum(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      COALESCE(sum(CASE WHEN success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms,
      max(timestamp) as last_used
    FROM tool_details
    WHERE detail_name != ''
      ${dateClause}
      ${projectFilter(project)}
    GROUP BY tool_name, CASE WHEN detail_type = 'mcp' THEN replace(tool_name, 'mcp:', '') ELSE detail_name END, agent_type
    ORDER BY invocation_count DESC
  `).all(...dateParams, ...projectParams(project)) as IndividualToolRow[]
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

export const getSessionDetail = async (sessionId: string): Promise<SessionDetailEvent[]> => {
  const db = getDb()
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

export const getProjects = async (): Promise<ProjectRow[]> => {
  const db = getDb()
  return db.prepare(`
    SELECT
      project_name,
      count(DISTINCT session_id) as session_count,
      COALESCE(sum(cost_usd), 0) as total_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
    GROUP BY project_name
    ORDER BY total_cost DESC
  `).all() as ProjectRow[]
}

export const getProjectCosts = async (agentType: string, from?: string, to?: string): Promise<ProjectRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : ''
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      project_name,
      count(DISTINCT session_id) as session_count,
      COALESCE(sum(cost_usd), 0) as total_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
      ${dateClause}
      ${agentFilter(agentType)}
    GROUP BY project_name
    ORDER BY total_cost DESC
    LIMIT 20
  `).all(...dateParams, ...agentParams(agentType)) as ProjectRow[]
}

export type ActiveSession = {
  session_id: string
  agent_type: string
  model: string
  last_event: string
  cost: number
  event_count: number
}

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
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

export type AgentDailyCost = {
  agent_type: string
  daily_cost: number
}

export const getAgentDailyCosts = async (): Promise<AgentDailyCost[]> => {
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

export type IngestStatusRow = {
  agent_type: string
  last_received: string
  today_count: number
  total_count: number
}

export const getIngestStatus = async (): Promise<IngestStatusRow[]> => {
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

export type ConfigComparePeriod = {
  avg_cost: number
  cache_rate: number
  tool_fail_rate: number
  request_count: number
}

export type ConfigCompareResult = {
  before: ConfigComparePeriod
  after: ConfigComparePeriod
}

const emptyPeriod: ConfigComparePeriod = { avg_cost: 0, cache_rate: 0, tool_fail_rate: 0, request_count: 0 }

export const getConfigCompareStats = async (date: string, days: number = 7): Promise<ConfigCompareResult> => {
  const db = getDb()

  const costCacheQuery = `
    SELECT
      COALESCE(avg(cost_usd), 0) as avg_cost,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_rate,
      count(*) as request_count
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `

  const toolFailQuery = `
    SELECT
      CASE WHEN count(*) > 0
        THEN CAST(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END) AS REAL) / count(*)
        ELSE 0
      END as tool_fail_rate
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `

  const changeDate = new Date(date)
  const beforeStart = new Date(changeDate)
  beforeStart.setDate(beforeStart.getDate() - days)
  const afterEnd = new Date(changeDate)
  afterEnd.setDate(afterEnd.getDate() + days)

  const beforeStartStr = beforeStart.toISOString().slice(0, 10)
  const changeDateStr = changeDate.toISOString().slice(0, 10)
  const afterEndStr = afterEnd.toISOString().slice(0, 10)

  const beforeCost = db.prepare(costCacheQuery).get(beforeStartStr, changeDateStr) as { avg_cost: number; cache_rate: number; request_count: number } | undefined
  const afterCost = db.prepare(costCacheQuery).get(changeDateStr, afterEndStr) as { avg_cost: number; cache_rate: number; request_count: number } | undefined
  const beforeTool = db.prepare(toolFailQuery).get(beforeStartStr, changeDateStr) as { tool_fail_rate: number } | undefined
  const afterTool = db.prepare(toolFailQuery).get(changeDateStr, afterEndStr) as { tool_fail_rate: number } | undefined

  return {
    before: {
      avg_cost: beforeCost?.avg_cost ?? 0,
      cache_rate: beforeCost?.cache_rate ?? 0,
      tool_fail_rate: beforeTool?.tool_fail_rate ?? 0,
      request_count: beforeCost?.request_count ?? 0,
    },
    after: afterCost ? {
      avg_cost: afterCost.avg_cost ?? 0,
      cache_rate: afterCost.cache_rate ?? 0,
      tool_fail_rate: afterTool?.tool_fail_rate ?? 0,
      request_count: afterCost.request_count ?? 0,
    } : emptyPeriod,
  }
}

// ─── Cost Insights (PER-31) ──────────────────────────────────────────────────

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

const EXPENSIVE_MODELS = ['claude-opus-4-6', 'claude-opus-4-20250514', 'o3', 'gpt-5.4']

const tagCauses = (row: RawHighCostRow): string[] => {
  const causes: string[] = []
  if (EXPENSIVE_MODELS.some(m => row.model.includes(m))) causes.push('expensive_model')
  if (row.tool_call_count >= 15) causes.push('many_tool_calls')
  if (row.request_count >= 10) causes.push('many_requests')
  if (row.cache_read_tokens === 0 && row.input_tokens > 10000) causes.push('no_cache')
  return causes
}

export const getHighCostSessions = async (days: number = 7, limit: number = 10, dbOverride?: import('better-sqlite3').Database): Promise<HighCostSession[]> => {
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

export const getModelCostEfficiency = async (days: number = 7, dbOverride?: import('better-sqlite3').Database): Promise<ModelCostEfficiency[]> => {
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

export type BudgetStatus = {
  agent_type: string
  daily_cost_limit: number
  monthly_cost_limit: number
  daily_spent: number
  daily_usage_pct: number
}

export const getBudgetStatus = async (dbOverride?: import('better-sqlite3').Database): Promise<BudgetStatus[]> => {
  const db = dbOverride ?? getDb()

  const agents = ['claude', 'codex', 'gemini']
  const limits = db.prepare('SELECT agent_type, daily_cost_limit, monthly_cost_limit FROM agent_limits').all() as Array<{ agent_type: string; daily_cost_limit: number; monthly_cost_limit: number }>
  const dailyCosts = db.prepare(`
    SELECT agent_type, COALESCE(sum(cost_usd), 0) as daily_spent
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER} AND date(timestamp) = date('now')
    GROUP BY agent_type
  `).all() as Array<{ agent_type: string; daily_spent: number }>

  return agents.map(agent => {
    const limit = limits.find(l => l.agent_type === agent)
    const cost = dailyCosts.find(c => c.agent_type === agent)
    const dailyLimit = limit?.daily_cost_limit ?? 0
    const dailySpent = cost?.daily_spent ?? 0
    return {
      agent_type: agent,
      daily_cost_limit: dailyLimit,
      monthly_cost_limit: limit?.monthly_cost_limit ?? 0,
      daily_spent: dailySpent,
      daily_usage_pct: dailyLimit > 0 ? (dailySpent / dailyLimit) * 100 : 0,
    }
  })
}
