import { NextResponse } from 'next/server'
import type { AgentType } from '@/shared/lib/agents'
import { API_LIMITS } from '@/shared/lib/constants'

const VALID_AGENT_TYPES = ['all', 'claude', 'codex', 'gemini'] as const

// ISO 8601 date: YYYY-MM-DD
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

/**
 * project 파라미터를 파싱한다. 길이 초과 시 'all'로 폴백한다.
 */
export const parseProject = (value: string | null, maxLength = 200): string => {
  if (!value || value.length > maxLength) return 'all'
  return value
}

/**
 * ISO 8601 날짜 문자열(YYYY-MM-DD)을 검증한다. 형식이 맞지 않으면 null을 반환한다.
 */
export const parseDateParam = (value: string | null): string | undefined => {
  if (!value) return undefined
  return ISO_DATE_RE.test(value) ? value : undefined
}

/**
 * 경로 슬러그(session id, tool name, project name 등)를 검증한다.
 * 빈 값이거나 길이 초과 시 null을 반환한다.
 */
export const parseSlug = (value: string, maxLength = 300): string | null => {
  if (!value || value.length > maxLength) return null
  return value
}

export const errorResponse = (message: string, status: number = 400) =>
  NextResponse.json({ error: message }, { status })

export const serverError = (context: string, error: unknown) => {
  console.error(`[${context}] error:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export { VALID_AGENT_TYPES }
