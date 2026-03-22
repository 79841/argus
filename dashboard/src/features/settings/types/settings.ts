export type Theme = 'light' | 'dark' | 'system'
export type AgentTheme = 'claude' | 'codex' | 'gemini'

export type Category = 'general' | 'agents' | 'pricing' | 'agentConnection' | 'projectConnection' | 'data'

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
