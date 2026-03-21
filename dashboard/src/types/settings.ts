export type Theme = 'light' | 'dark' | 'system'
export type AgentTheme = 'claude' | 'codex' | 'gemini'

export type Category = 'general' | 'agents' | 'pricing' | 'agentConnection' | 'projectConnection' | 'data'

export type AgentLimitState = {
  agent_type: string
  daily_cost_limit: string
  monthly_cost_limit: string
}

export type AgentConnectionStatus = {
  type: string
  configPath: string
  displayPath: string
  installed: boolean
  configured: boolean
  endpoint: string | null
}

export type RegistryProject = {
  project_name: string
  project_path: string
  created_at: string
}
