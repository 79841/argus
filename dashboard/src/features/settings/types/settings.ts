export type Theme = 'light' | 'dark' | 'system'
export type AgentTheme = 'default' | 'claude' | 'codex' | 'gemini'

export type Category = 'general' | 'pricing' | 'agentConnection' | 'projectConnection' | 'hooksConnection'

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
