import type { ConfigFileEntry } from './config.types'

export const PROJECT_STATIC_FILES: ConfigFileEntry[] = [
  { agent: 'claude', path: 'CLAUDE.md' },
  { agent: 'claude', path: '.claude/settings.json' },
  { agent: 'claude', path: '.mcp.json' },
  { agent: 'codex', path: 'codex.md' },
  { agent: 'codex', path: 'AGENTS.md' },
  { agent: 'gemini', path: 'GEMINI.md' },
]

export const USER_STATIC_FILES: ConfigFileEntry[] = [
  { agent: 'claude', path: '~/.claude/settings.json' },
  { agent: 'codex', path: '~/.codex/config.toml' },
  { agent: 'codex', path: '~/.codex/instructions.md' },
  { agent: 'gemini', path: '~/.gemini/settings.json' },
]
