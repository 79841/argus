import { NextResponse } from 'next/server'
import type { AgentType } from '@/shared/lib/agents'
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

export const errorResponse = (message: string, status: number = 400) =>
  NextResponse.json({ error: message }, { status })

export const serverError = (context: string, error: unknown) => {
  console.error(`[${context}] error:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export { VALID_AGENT_TYPES }
