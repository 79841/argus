import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildMinuteMap, getPointForMinute, toLocalMinuteKey, emptyPoint } from '../lib/heartbeat-utils'
import type { HeartbeatRaw } from '../lib/transform'

describe('toLocalMinuteKey', () => {
  const FIXED_NOW = new Date(2026, 2, 27, 14, 35, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('UTC ISO 문자열을 로컬 HH:MM으로 변환한다', () => {
    const utcHH = String(FIXED_NOW.getUTCHours()).padStart(2, '0')
    const utcMM = String(FIXED_NOW.getUTCMinutes()).padStart(2, '0')
    const iso = `2026-03-27T${utcHH}:${utcMM}`

    const result = toLocalMinuteKey(iso)

    expect(result).toBe('14:35')
  })

  it('결과는 HH:MM 형식이다', () => {
    const result = toLocalMinuteKey('2026-03-27T05:30')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('buildMinuteMap', () => {
  const FIXED_NOW = new Date(2026, 2, 27, 14, 35, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const utcMinute = (minutesAgo: number): string => {
    const d = new Date(FIXED_NOW.getTime() - minutesAgo * 60_000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }

  it('빈 입력이면 빈 Map을 반환한다', () => {
    const result = buildMinuteMap([])
    expect(result.size).toBe(0)
  })

  it('에이전트별 토큰을 로컬 분 키로 집계한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: utcMinute(0), agent_type: 'claude', total_tokens: 1000 },
      { minute: utcMinute(0), agent_type: 'codex', total_tokens: 500 },
    ]
    const result = buildMinuteMap(rows)

    expect(result.size).toBe(1)
    const entry = result.values().next().value!
    expect(entry.claude).toBe(1000)
    expect(entry.codex).toBe(500)
  })

  it('동일 분의 동일 에이전트 토큰을 합산한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: utcMinute(1), agent_type: 'claude', total_tokens: 300 },
      { minute: utcMinute(1), agent_type: 'claude', total_tokens: 200 },
    ]
    const result = buildMinuteMap(rows)

    const entry = result.values().next().value!
    expect(entry.claude).toBe(500)
  })

  it('서로 다른 분은 별도 키로 저장한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: utcMinute(0), agent_type: 'claude', total_tokens: 100 },
      { minute: utcMinute(1), agent_type: 'claude', total_tokens: 200 },
    ]
    const result = buildMinuteMap(rows)
    expect(result.size).toBe(2)
  })

  it('알 수 없는 에이전트 타입은 무시한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: utcMinute(0), agent_type: 'unknown', total_tokens: 999 },
    ]
    const result = buildMinuteMap(rows)
    expect(result.size).toBe(0)
  })

  it('claude, codex, gemini만 허용한다', () => {
    const rows: HeartbeatRaw[] = [
      { minute: utcMinute(0), agent_type: 'claude', total_tokens: 100 },
      { minute: utcMinute(0), agent_type: 'codex', total_tokens: 200 },
      { minute: utcMinute(0), agent_type: 'gemini', total_tokens: 300 },
      { minute: utcMinute(0), agent_type: 'gpt', total_tokens: 400 },
    ]
    const result = buildMinuteMap(rows)

    expect(result.size).toBe(1)
    const entry = result.values().next().value!
    expect(entry.claude).toBe(100)
    expect(entry.codex).toBe(200)
    expect(entry.gemini).toBe(300)
    expect(entry.gpt).toBeUndefined()
  })
})

describe('getPointForMinute', () => {
  it('매칭되는 키가 있으면 에이전트별 토큰을 반환한다', () => {
    const map = new Map([['14:35', { claude: 1000, codex: 500 }]])

    const result = getPointForMinute(map, '14:35')

    expect(result.claude).toBe(1000)
    expect(result.codex).toBe(500)
    expect(result.gemini).toBe(0)
  })

  it('매칭되는 키가 없으면 모든 값이 0인 포인트를 반환한다', () => {
    const map = new Map<string, Record<string, number>>()

    const result = getPointForMinute(map, '14:35')

    expect(result.claude).toBe(0)
    expect(result.codex).toBe(0)
    expect(result.gemini).toBe(0)
  })

  it('tick은 항상 0이다', () => {
    const map = new Map([['14:35', { claude: 100 }]])

    const result = getPointForMinute(map, '14:35')

    expect(result.tick).toBe(0)
  })
})

describe('emptyPoint', () => {
  it('모든 값이 0인 포인트를 반환한다', () => {
    const point = emptyPoint()
    expect(point).toEqual({ tick: 0, claude: 0, codex: 0, gemini: 0 })
  })

  it('매번 새 객체를 반환한다', () => {
    const a = emptyPoint()
    const b = emptyPoint()
    expect(a).not.toBe(b)
  })
})
