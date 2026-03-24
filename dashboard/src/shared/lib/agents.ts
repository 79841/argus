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

export const AGENT_TOOL_CATEGORIES: Record<string, string[]> = {
  'File Read': ['Read', 'read_file', 'cat'],
  'File Write': ['Write', 'write_file', 'patch_file'],
  'File Edit': ['Edit', 'edit_file'],
  'Shell': ['Bash', 'shell', 'run_shell_command'],
  'Search': ['Glob', 'Grep', 'grep', 'list_directory', 'web_search'],
  'Orchestration': ['Agent', 'Skill'],
}

export const AGENT_CONFIG_FILE_PATHS: Record<'claude' | 'codex' | 'gemini', string[]> = {
  claude: ['.claude', 'settings.json'],
  codex: ['.codex', 'config.toml'],
  gemini: ['.gemini', 'settings.json'],
}
