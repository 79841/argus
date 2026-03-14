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
  total_input_tokens: number
  total_output_tokens: number
}

export const getOverviewStats = async (agentType: string, project: string = 'all', from?: string, to?: string): Promise<OverviewStats> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) = date('now')"
  const dateParams = useDate ? [from, to] : []

  const row = db.prepare(`
    SELECT
      count(DISTINCT session_id) as total_sessions,
      COALESCE(sum(cost_usd), 0) as total_cost,
      COALESCE(sum(input_tokens), 0) as total_input_tokens,
      COALESCE(sum(output_tokens), 0) as total_output_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      ${dateClause}
      ${agentFilter(agentType)}
      ${projectFilter(project)}
  `).get(...dateParams, ...agentParams(agentType), ...projectParams(project)) as OverviewStats | undefined

  return row ?? { total_sessions: 0, total_cost: 0, total_input_tokens: 0, total_output_tokens: 0 }
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

export const getSessions = async (agentType: string, project: string = 'all', from?: string, to?: string): Promise<SessionRow[]> => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : ''
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      session_id,
      agent_type,
      (SELECT m.model FROM agent_logs m WHERE m.session_id = agent_logs.session_id AND m.event_name = 'api_request' AND m.model != '' GROUP BY m.model ORDER BY count(*) DESC LIMIT 1) as model,
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
    LIMIT 100
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as SessionRow[]
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
