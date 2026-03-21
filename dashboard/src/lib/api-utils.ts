import type { AgentType } from '@/lib/agents'
import { API_LIMITS } from '@/shared/lib/constants'

const VALID_AGENT_TYPES = ['all', 'claude', 'codex', 'gemini'] as const

export const parseAgentType = (value: string | null): AgentType =>
  VALID_AGENT_TYPES.includes(value as AgentType) ? (value as AgentType) : 'all'

export const parseDays = (value: string | null, defaultValue: number): number => {
  const n = parseInt(value ?? '', 10)
  return isNaN(n) || n < 1 || n > API_LIMITS.MAX_DAYS ? defaultValue : n
}

export const parseLimit = (value: string | null, defaultValue: number): number => {
  const n = Number(value)
  return isNaN(n) || n < 1 || n > API_LIMITS.MAX_LIMIT ? defaultValue : n
}

export { VALID_AGENT_TYPES }
