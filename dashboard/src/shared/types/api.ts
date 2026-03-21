export type AgentStatus = {
  agent_type: string
  last_received: string
  today_count: number
  total_count: number
}

export type AllTimeTotals = {
  total_cost: number
  total_tokens: number
}

export type AgentLimit = {
  agent_type: string
  daily_cost_limit: number
  monthly_cost_limit: number
}

export type AgentDailyCost = {
  agent_type: string
  daily_cost: number
}

export type ActiveSessionInfo = {
  session_id: string
  agent_type: string
  model: string
  last_event: string
  cost: number
  event_count: number
}
