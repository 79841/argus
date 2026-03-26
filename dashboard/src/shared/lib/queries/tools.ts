import { getDb } from '../db'
import { agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type ToolUsageRow = {
  tool_name: string
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
}

export type DailyToolRow = {
  date: string
  tool_name: string
  count: number
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

export const getToolUsageStats = (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): ToolUsageRow[] => {
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

export const getDailyToolStats = (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): DailyToolRow[] => {
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

export const getToolDetailStats = (agentType: string, days: number = 7, project: string = 'all', from?: string, to?: string): ToolDetailRow[] => {
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

export type ToolSingleStat = {
  tool_name: string
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
  total_cost: number
  last_used: string
}

export type ToolDailyRow = {
  date: string
  count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
}

export type ToolSessionRow = {
  session_id: string
  project_name: string
  agent_type: string
  call_count: number
  success_count: number
  date: string
}

export const getToolSingleStat = (toolName: string, days: number): ToolSingleStat | null => {
  const db = getDb()
  return db.prepare(`
    SELECT
      tool_name,
      count(*) as invocation_count,
      COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms,
      COALESCE(sum(cost_usd), 0) as total_cost,
      max(timestamp) as last_used
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND tool_name = ?
      AND date(timestamp) >= date('now', '-' || ? || ' days')
    GROUP BY tool_name
  `).get(toolName, days) as ToolSingleStat | null
}

export const getToolDailyStats = (toolName: string, days: number): ToolDailyRow[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      date(timestamp) as date,
      count(*) as count,
      COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      COALESCE(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END), 0) as fail_count,
      COALESCE(avg(duration_ms), 0) as avg_duration_ms
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND tool_name = ?
      AND date(timestamp) >= date('now', '-' || ? || ' days')
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all(toolName, days) as ToolDailyRow[]
}

export const getToolRelatedSessions = (toolName: string, days: number, limit: number = 20): ToolSessionRow[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      session_id,
      project_name,
      agent_type,
      count(*) as call_count,
      COALESCE(sum(CASE WHEN tool_success = 1 THEN 1 ELSE 0 END), 0) as success_count,
      date(max(timestamp)) as date
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND tool_name = ?
      AND date(timestamp) >= date('now', '-' || ? || ' days')
    GROUP BY session_id
    ORDER BY max(timestamp) DESC
    LIMIT ?
  `).all(toolName, days, limit) as ToolSessionRow[]
}

export const getIndividualToolStats = (agentType: string, days: number = 30, project: string = 'all', from?: string, to?: string): IndividualToolRow[] => {
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
      ${agentFilter(agentType)}
      ${projectFilter(project)}
    GROUP BY tool_name, CASE WHEN detail_type = 'mcp' THEN replace(tool_name, 'mcp:', '') ELSE detail_name END, agent_type
    ORDER BY invocation_count DESC
  `).all(...dateParams, ...agentParams(agentType), ...projectParams(project)) as IndividualToolRow[]
}
