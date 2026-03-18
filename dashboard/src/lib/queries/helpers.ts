export const API_REQUEST_FILTER = "event_name = 'api_request'"

const VALID_AGENT_TYPES = new Set(['all', 'claude', 'codex', 'gemini'])

export const sanitizeAgentType = (agentType: string): string =>
  VALID_AGENT_TYPES.has(agentType) ? agentType : 'all'

export const agentFilter = (agentType: string) =>
  agentType !== 'all' ? `AND agent_type = ?` : ''

export const agentParams = (agentType: string) =>
  agentType !== 'all' ? [agentType] : []

export const projectFilter = (project: string) =>
  project !== 'all' ? `AND project_name = ?` : ''

export const projectParams = (project: string) =>
  project !== 'all' ? [project] : []

export const dateRangeFilter = () =>
  `AND date(timestamp) >= date(?) AND date(timestamp) <= date(?)`
