import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'
import { insertApiRequest } from './test-helpers'

let testDb: Database.Database

vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { getEfficiencyStats, getEfficiencyComparison } = await import('../queries/efficiency')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getEfficiencyStats', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getEfficiencyStats()).toHaveLength(0)
  })

  it('에이전트별, 날짜별 효율성 통계를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', input_tokens: 1000, cache_read_tokens: 400, cost_usd: 0.5, duration_ms: 2000 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'claude', input_tokens: 800, cache_read_tokens: 200, cost_usd: 0.3, duration_ms: 1500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', input_tokens: 500, cache_read_tokens: 0, cost_usd: 0.1, duration_ms: 1000 })

    const stats = getEfficiencyStats('all', 30)
    const claudeMar14 = stats.find(s => s.agent_type === 'claude' && s.date === '2026-03-14')
    expect(claudeMar14).toBeDefined()
    expect(claudeMar14!.total_input).toBe(1800)
    expect(claudeMar14!.total_requests).toBe(2)
    expect(claudeMar14!.cost).toBeCloseTo(0.8)
  })

  it('cache_hit_rate를 올바르게 계산한다', () => {
    // 1000 input + 500 cache_read → hit_rate = 500/1500
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', input_tokens: 1000, cache_read_tokens: 500 })

    const stats = getEfficiencyStats('all', 30)
    expect(stats).toHaveLength(1)
    expect(stats[0].cache_hit_rate).toBeCloseTo(500 / 1500, 5)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z' })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z' })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z' })

    const stats = getEfficiencyStats('all', 30, 'all', '2026-03-13', '2026-03-17')
    expect(stats).toHaveLength(1)
    expect(stats[0].date).toBe('2026-03-15')
  })

  it('날짜 오름차순으로 정렬된다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-16T10:00:00Z' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z' })

    const stats = getEfficiencyStats('all', 30)
    expect(stats[0].date <= stats[stats.length - 1].date).toBe(true)
  })
})

describe('getEfficiencyComparison', () => {
  it('현재 기간과 이전 기간을 분리하여 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-07T10:00:00Z', agent_type: 'claude', cost_usd: 2.0 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', cost_usd: 1.0 })

    const result = getEfficiencyComparison('all', 7)
    expect(result).toHaveProperty('current')
    expect(result).toHaveProperty('previous')
    expect(Array.isArray(result.current)).toBe(true)
    expect(Array.isArray(result.previous)).toBe(true)
  })

  it('날짜 범위 지정 시 이전 기간을 자동으로 계산한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-01T10:00:00Z', cost_usd: 3.0 })
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', cost_usd: 1.0 })

    const result = getEfficiencyComparison('all', 7, 'all', '2026-03-08', '2026-03-14')
    expect(result.current).toBeDefined()
    expect(result.previous).toBeDefined()
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getEfficiencyComparison('all', 7)
    expect(result.current).toHaveLength(0)
    expect(result.previous).toHaveLength(0)
  })
})
