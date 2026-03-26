import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { detectCompletedSessions, buildSessionSummary } from '../lib/session-completion'
import type { ActiveSessionInfo } from '@/shared/types/api'

const makeSession = (overrides: Partial<ActiveSessionInfo> = {}): ActiveSessionInfo => ({
  session_id: 'sess-1',
  agent_type: 'claude',
  model: 'claude-sonnet',
  last_event: new Date().toISOString(),
  cost: 0.5,
  event_count: 10,
  ...overrides,
})

describe('detectCompletedSessions', () => {
  const NOW = 1_700_000_000_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('활성 세션 2개 → 1개로 줄어듦 → 완료 1개', () => {
    const prev = [
      makeSession({ session_id: 'sess-1' }),
      makeSession({ session_id: 'sess-2' }),
    ]
    const curr = [makeSession({ session_id: 'sess-1' })]

    const result = detectCompletedSessions(prev, curr)

    expect(result).toHaveLength(1)
    expect(result[0].session_id).toBe('sess-2')
  })

  it('변화 없음 → 빈 배열', () => {
    const prev = [makeSession({ session_id: 'sess-1' })]
    const curr = [makeSession({ session_id: 'sess-1' })]

    const result = detectCompletedSessions(prev, curr)

    expect(result).toHaveLength(0)
  })

  it('모두 사라짐 → 전부 완료', () => {
    const prev = [
      makeSession({ session_id: 'sess-1' }),
      makeSession({ session_id: 'sess-2' }),
      makeSession({ session_id: 'sess-3' }),
    ]
    const curr: ActiveSessionInfo[] = []

    const result = detectCompletedSessions(prev, curr)

    expect(result).toHaveLength(3)
  })

  it('prev undefined → 빈 배열 (최초 로드)', () => {
    const curr = [makeSession({ session_id: 'sess-1' })]

    const result = detectCompletedSessions(undefined, curr)

    expect(result).toHaveLength(0)
  })

  it('last_event 60초 미경과 → 빈 배열', () => {
    const recentIso = new Date(NOW - 30_000).toISOString()
    const prev = [makeSession({ session_id: 'sess-1', last_event: recentIso })]
    const curr = [makeSession({ session_id: 'sess-1', last_event: recentIso })]

    const result = detectCompletedSessions(prev, curr, 60_000)

    expect(result).toHaveLength(0)
  })

  it('last_event 60초 경과 → 완료 감지', () => {
    const oldIso = new Date(NOW - 61_000).toISOString()
    const prev = [makeSession({ session_id: 'sess-1', last_event: oldIso })]
    const curr = [makeSession({ session_id: 'sess-1', last_event: oldIso })]

    const result = detectCompletedSessions(prev, curr, 60_000)

    expect(result).toHaveLength(1)
    expect(result[0].session_id).toBe('sess-1')
  })
})

describe('buildSessionSummary', () => {
  it('세션에서 요약 데이터를 추출한다', () => {
    vi.useFakeTimers()
    const NOW = 1_700_000_000_000
    vi.setSystemTime(NOW)

    const session = makeSession({
      agent_type: 'claude',
      cost: 1.23,
      event_count: 15,
      last_event: new Date(NOW - 10_000).toISOString(),
    })

    const summary = buildSessionSummary(session)

    expect(summary.agentType).toBe('claude')
    expect(summary.cost).toBe(1.23)
    expect(summary.eventCount).toBe(15)
    expect(summary.durationMs).toBeGreaterThanOrEqual(10_000)

    vi.useRealTimers()
  })
})
