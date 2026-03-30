import type { ConfigFileEntry } from './config.types'

export const PROJECT_STATIC_FILES: ConfigFileEntry[] = [
  { agent: 'claude', path: 'CLAUDE.md' },
  { agent: 'claude', path: '.claude/CLAUDE.md' },
  { agent: 'claude', path: 'REVIEW.md' },
  { agent: 'codex', path: 'AGENTS.md' },
  { agent: 'codex', path: 'AGENTS.override.md' },
  { agent: 'gemini', path: 'GEMINI.md' },
]

export const USER_STATIC_FILES: ConfigFileEntry[] = [
  { agent: 'claude', path: '~/.claude/CLAUDE.md' },
  { agent: 'codex', path: '~/.codex/AGENTS.md' },
  { agent: 'codex', path: '~/.codex/AGENTS.override.md' },
  { agent: 'gemini', path: '~/.gemini/GEMINI.md' },
]
