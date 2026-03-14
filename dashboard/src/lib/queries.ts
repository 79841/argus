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

export type OverviewStats = {
  total_sessions: number
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
}

export const getOverviewStats = async (agentType: string, project: string = 'all'): Promise<OverviewStats> => {
  const db = getDb()
  const row = db.prepare(`
    SELECT
      count(DISTINCT session_id) as total_sessions,
      COALESCE(sum(cost_usd), 0) as total_cost,
      COALESCE(sum(input_tokens), 0) as total_input_tokens,
      COALESCE(sum(output_tokens), 0) as total_output_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) = date('now')
      ${agentFilter(agentType)}
      ${projectFilter(project)}
  `).get(...agentParams(agentType), ...projectParams(project)) as OverviewStats | undefined

  return row ?? { total_sessions: 0, total_cost: 0, total_input_tokens: 0, total_output_tokens: 0 }
}

export type DailyStats = {
  date: string
  sessions: number
  cost: number
  input_tokens: number
  output_tokens: number
  agent_type: string
}

export const getDailyStats = async (agentType: string, days: number = 30, project: string = 'all'): Promise<DailyStats[]> => {
  const db = getDb()
  const agentSelect = agentType === 'all' ? 'agent_type' : `'${agentType}' as agent_type`
  const agentGroupBy = agentType === 'all' ? ', agent_type' : ''

  return db.prepare(`
    SELECT
      date(timestamp) as date,
      ${agentSelect},
      count(DISTINCT session_id) as sessions,
      COALESCE(sum(cost_usd), 0) as cost,
      COALESCE(sum(input_tokens), 0) as input_tokens,
      COALESCE(sum(output_tokens), 0) as output_tokens
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) >= date('now', '-' || ? || ' days')
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY date${agentGroupBy}
    ORDER BY date ASC
  `).all(days, ...agentParams(agentType), ...projectParams(project)) as DailyStats[]
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

export const getSessions = async (agentType: string, project: string = 'all'): Promise<SessionRow[]> => {
  const db = getDb()
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
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY session_id, agent_type
    ORDER BY started_at DESC
    LIMIT 100
  `).all(...agentParams(agentType), ...projectParams(project)) as SessionRow[]
}

export type ModelUsage = {
  model: string
  agent_type: string
  request_count: number
  cost: number
}

export const getModelUsage = async (agentType: string, project: string = 'all'): Promise<ModelUsage[]> => {
  const db = getDb()
  return db.prepare(`
    SELECT
      model,
      agent_type,
      count(*) as request_count,
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND model != ''
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY model, agent_type
    ORDER BY request_count DESC
  `).all(...agentParams(agentType), ...projectParams(project)) as ModelUsage[]
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
}

export const getEfficiencyStats = async (days: number = 7, project: string = 'all'): Promise<EfficiencyRow[]> => {
  const db = getDb()
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
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND date(timestamp) >= date('now', '-' || ? || ' days')
      ${projectFilter(project)}
    GROUP BY agent_type, date
    ORDER BY date ASC
  `).all(days, ...projectParams(project)) as EfficiencyRow[]
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

export const getToolUsageStats = async (agentType: string, days: number = 7, project: string = 'all'): Promise<ToolUsageRow[]> => {
  const db = getDb()
  return db.prepare(`
    SELECT
      tool_name,
      count(*) as invocation_count,
      COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND date(timestamp) >= date('now', '-' || ? || ' days')
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY tool_name
    ORDER BY invocation_count DESC
    LIMIT 30
  `).all(days, ...agentParams(agentType), ...projectParams(project)) as ToolUsageRow[]
}

export type DailyToolRow = {
  date: string
  tool_name: string
  count: number
}

export const getDailyToolStats = async (agentType: string, days: number = 7, project: string = 'all'): Promise<DailyToolRow[]> => {
  const db = getDb()
  return db.prepare(`
    SELECT
      date(timestamp) as date,
      tool_name,
      count(*) as count
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND date(timestamp) >= date('now', '-' || ? || ' days')
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY date(timestamp), tool_name
    ORDER BY date ASC, count DESC
  `).all(days, ...agentParams(agentType), ...projectParams(project)) as DailyToolRow[]
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

export const getToolDetailStats = async (agentType: string, days: number = 7, project: string = 'all'): Promise<ToolDetailRow[]> => {
  const db = getDb()
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
        AND date(timestamp) >= date('now', '-' || ? || ' days')
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
        AND date(timestamp) >= date('now', '-' || ? || ' days')
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
    days, ...agentParams(agentType), ...projectParams(project),
    days, ...agentParams(agentType), ...projectParams(project)
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

export const getIndividualToolStats = async (days: number = 30, project: string = 'all'): Promise<IndividualToolRow[]> => {
  const db = getDb()
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
    WHERE date(timestamp) >= date('now', '-' || ? || ' days')
      AND detail_name != ''
      ${projectFilter(project)}
    GROUP BY tool_name, CASE WHEN detail_type = 'mcp' THEN replace(tool_name, 'mcp:', '') ELSE detail_name END, agent_type
    ORDER BY invocation_count DESC
  `).all(days, ...projectParams(project)) as IndividualToolRow[]
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
