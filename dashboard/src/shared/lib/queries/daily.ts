import { getDb } from '../db'
import { API_REQUEST_FILTER, sanitizeAgentType, agentFilter, agentParams, projectFilter, projectParams, dateRangeFilter } from './helpers'

export type DailyStats = {
  date: string
  sessions: number
  cost: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  agent_type: string
}

export const getDailyStats = (agentType: string, days: number = 30, project: string = 'all', from?: string, to?: string): DailyStats[] => {
  const db = getDb()
  const safeAgentType = sanitizeAgentType(agentType)
  const agentSelect = safeAgentType === 'all' ? 'agent_type' : `? as agent_type`
  const agentGroupBy = safeAgentType === 'all' ? ', agent_type' : ''
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : "AND date(timestamp) >= date('now', '-' || ? || ' days')"
  const dateParams = useDate ? [from, to] : [days]

  const selectParams = safeAgentType === 'all' ? [] : [safeAgentType]

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
      ${agentFilter(safeAgentType)}
      ${projectFilter(project)}
    GROUP BY date${agentGroupBy}
    ORDER BY date ASC
  `).all(...selectParams, ...dateParams, ...agentParams(safeAgentType), ...projectParams(project)) as DailyStats[]
}
