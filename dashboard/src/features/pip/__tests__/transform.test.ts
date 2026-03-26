import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { transformHeartbeat } from '../lib/transform'
import type { HeartbeatRaw } from '../lib/transform'

/**
 * generateMinuteRange는 로컬 시간(getHours/getMinutes)을 기준으로 레이블을 생성한다.
 * 따라서 테스트에서는 vi.setSystemTime으로 고정한 로컬 시간을 기준으로 기대값을 계산한다.
 */
const toLocalHHMM = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

describe('transformHeartbeat', () => {
  // 로컬 시간 기준으로 픽스드 시간 설정
  const FIXED_NOW = new Date(2026, 2, 27, 14, 35, 0, 0) // 2026-03-27 14:35 로컬

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const labelAt = (minutesAgo: number) => {
    const d = new Date(FIXED_NOW.getTime() - minutesAgo * 60 * 1000)
    return toLocalHHMM(d)
  }

  const isoAt = (minutesAgo: number) => {
    const d = new Date(FIXED_NOW.getTime() - minutesAgo * 60 * 1000)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${date}T${hh}:${mm}`
  }

  it('minutes 개수만큼 데이터 포인트를 반환한다', () => {
    const result = transformHeartbeat([], 5)
    expect(result).toHaveLength(5)
  })

  it('빈 입력에서 모든 에이전트 토큰이 0이다', () => {
    const result = transformHeartbeat([], 3)
    for (const point of result) {
      expect(point.claude).toBe(0)
      expect(point.codex).toBe(0)
      expect(point.gemini).toBe(0)
    }
  })

  it('에이전트별 토큰을 올바른 분에 매핑한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: isoAt(0), agent_type: 'claude', total_tokens: 1000 },
      { minute: isoAt(1), agent_type: 'codex', total_tokens: 500 },
    ]
    const result = transformHeartbeat(rows, 5)

    const current = result.find((d) => d.minute === labelAt(0))
    const prev = result.find((d) => d.minute === labelAt(1))

    expect(current?.claude).toBe(1000)
    expect(current?.codex).toBe(0)
    expect(prev?.codex).toBe(500)
    expect(prev?.claude).toBe(0)
  })

  it('동일한 분의 동일 에이전트 토큰을 합산한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: isoAt(0), agent_type: 'gemini', total_tokens: 300 },
      { minute: isoAt(0), agent_type: 'gemini', total_tokens: 200 },
    ]
    const result = transformHeartbeat(rows, 5)
    const current = result.find((d) => d.minute === labelAt(0))
    expect(current?.gemini).toBe(500)
  })

  it('시간 범위 밖의 데이터는 무시한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: isoAt(60), agent_type: 'claude', total_tokens: 9999 },
    ]
    const result = transformHeartbeat(rows, 5)
    const total = result.reduce((sum, d) => sum + d.claude, 0)
    expect(total).toBe(0)
  })

  it('알 수 없는 에이전트 타입은 무시한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: isoAt(0), agent_type: 'unknown_agent', total_tokens: 999 },
    ]
    const result = transformHeartbeat(rows, 5)
    const current = result.find((d) => d.minute === labelAt(0))
    expect(current?.claude).toBe(0)
    expect(current?.codex).toBe(0)
    expect(current?.gemini).toBe(0)
  })

  it('결과의 minute 레이블은 HH:MM 형식이다', () => {
    const result = transformHeartbeat([], 3)
    for (const point of result) {
      expect(point.minute).toMatch(/^\d{2}:\d{2}$/)
    }
  })
})
