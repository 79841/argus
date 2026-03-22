import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/types/common'

export type DailyCostPoint = {
  date: string
  claude: number
  codex: number
  gemini: number
  total: number
}

export type AgentCostPoint = { agent: string; cost: number; agentId: AgentType }
export type ProjectCostPoint = { project: string; cost: number }

export type CostTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

export type DailyTokenPoint = {
  date: string
  input: number
  output: number
  cache_read: number
}

export type AgentTokenPoint = { agent: string; input: number; output: number; cache_read: number; agentId: AgentType }

export type TokensTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

export type ModelTableRow = {
  model: string
  agent_type: string
  request_count: number
  cost: number
  avg_cost: number
}

export type ModelsTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

export type EfficiencyAgentRow = {
  agent_type: string
  cache_rate: number
  token_efficiency: number
  avg_duration_s: number
  score: number
}

export type EfficiencyTrendPoint = {
  date: string
  [agent: string]: number | string | null
}

export type EfficiencyTabProps = {
  project: string
  dateRange: DateRange
}

export type CategoryType = 'all' | 'rules' | 'tools'

export type ImpactTabProps = {
  dateRange: DateRange
}
