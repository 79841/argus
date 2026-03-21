export type AgentType = 'all' | 'codex' | 'claude' | 'gemini'

export type AgentConfig = {
  id: AgentType
  name: string
  color: string
  hex: string
  cssVar: string
  cssVarMuted: string
  cssVarSubtle: string
}

export const AGENTS: Record<AgentType, AgentConfig> = {
  all: {
    id: 'all',
    name: 'All Agents',
    color: 'violet',
    hex: '#8b5cf6',
    cssVar: 'var(--agent-all)',
    cssVarMuted: 'var(--agent-all)',
    cssVarSubtle: 'var(--agent-all)',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    color: 'emerald',
    hex: '#10b981',
    cssVar: 'var(--agent-codex)',
    cssVarMuted: 'var(--agent-codex-muted)',
    cssVarSubtle: 'var(--agent-codex-subtle)',
  },
  claude: {
    id: 'claude',
    name: 'Claude Code',
    color: 'orange',
    hex: '#f97316',
    cssVar: 'var(--agent-claude)',
    cssVarMuted: 'var(--agent-claude-muted)',
    cssVarSubtle: 'var(--agent-claude-subtle)',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    color: 'blue',
    hex: '#3b82f6',
    cssVar: 'var(--agent-gemini)',
    cssVarMuted: 'var(--agent-gemini-muted)',
    cssVarSubtle: 'var(--agent-gemini-subtle)',
  },
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
