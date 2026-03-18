const VALID_AGENT_TYPES = ['all', 'claude', 'codex', 'gemini'] as const
export type AgentType = typeof VALID_AGENT_TYPES[number]

export const parseAgentType = (value: string | null): AgentType =>
  VALID_AGENT_TYPES.includes(value as AgentType) ? (value as AgentType) : 'all'

export const parseDays = (value: string | null, defaultValue: number): number => {
  const n = parseInt(value ?? '', 10)
  return isNaN(n) || n < 1 || n > 365 ? defaultValue : n
}

export const parseLimit = (value: string | null, defaultValue: number): number => {
  const n = Number(value)
  return isNaN(n) || n < 1 || n > 10000 ? defaultValue : n
}

export { VALID_AGENT_TYPES }
