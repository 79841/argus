export type AgentType = 'all' | 'codex' | 'claude' | 'gemini'

export type AgentConfig = {
  id: AgentType
  name: string
  color: string
  hex: string
}

export const AGENTS: Record<AgentType, AgentConfig> = {
  all: { id: 'all', name: 'All Agents', color: 'violet', hex: '#8b5cf6' },
  codex: { id: 'codex', name: 'Codex', color: 'emerald', hex: '#10b981' },
  claude: { id: 'claude', name: 'Claude Code', color: 'orange', hex: '#f97316' },
  gemini: { id: 'gemini', name: 'Gemini CLI', color: 'blue', hex: '#3b82f6' },
}

export const AGENT_LIST: AgentConfig[] = [
  AGENTS.all,
  AGENTS.codex,
  AGENTS.claude,
  AGENTS.gemini,
]

export const getAgentColor = (agentType: string): string => {
  return AGENTS[agentType as AgentType]?.hex ?? '#8b5cf6'
}
