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
    const result = getEfficiencyStats('all', 7)
    expect(result).toEqual([])
  })

  it('에이전트별, 날짜별 효율성 통계를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', input_tokens: 1000, output_tokens: 500, cost_usd: 0.05, duration_ms: 2000 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'claude', input_tokens: 800, output_tokens: 400, cost_usd: 0.03, duration_ms: 1500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', input_tokens: 500, output_tokens: 200, cost_usd: 0.01, duration_ms: 1000 })

    const result = getEfficiencyStats('all', 30, 'all', '2026-03-14', '2026-03-14')

    const claudeRow = result.find(r => r.agent_type === 'claude' && r.date === '2026-03-14')
    expect(claudeRow).toBeDefined()
    expect(claudeRow!.total_input).toBe(1800)
    expect(claudeRow!.total_output).toBe(900)
    expect(claudeRow!.total_requests).toBe(2)
    expect(claudeRow!.cost).toBeCloseTo(0.08)
    expect(claudeRow!.total_duration_ms).toBe(3500)

    const codexRow = result.find(r => r.agent_type === 'codex' && r.date === '2026-03-14')
    expect(codexRow).toBeDefined()
    expect(codexRow!.total_input).toBe(500)
    expect(codexRow!.total_requests).toBe(1)
  })

  it('cache_hit_rate를 올바르게 계산한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', input_tokens: 1000, cache_read_tokens: 500 })

    const result = getEfficiencyStats('all', 30, 'all', '2026-03-14', '2026-03-14')
    expect(result).toHaveLength(1)
    // cache_hit_rate = cache_read / (input + cache_read) = 500 / 1500
    expect(result[0].cache_hit_rate).toBeCloseTo(500 / 1500, 5)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', cost_usd: 0.01 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', cost_usd: 0.10 })

    const result = getEfficiencyStats('all', 30, 'all', '2026-03-13', '2026-03-15')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-14')
    expect(result[0].cost).toBeCloseTo(0.05)
  })

  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'codex', cost_usd: 0.03 })

    const result = getEfficiencyStats('claude', 30, 'all', '2026-03-14', '2026-03-14')
    expect(result).toHaveLength(1)
    expect(result[0].agent_type).toBe('claude')
    expect(result[0].cost).toBeCloseTo(0.05)
  })
})

describe('getEfficiencyComparison', () => {
  it('현재 기간과 이전 기간을 분리하여 반환한다', () => {
    // Previous period: 2026-03-01 to 2026-03-07
    insertApiRequest(testDb, { timestamp: '2026-03-03T10:00:00Z', agent_type: 'claude', cost_usd: 2.0, input_tokens: 5000, output_tokens: 2000 })
    // Current period: 2026-03-08 to 2026-03-14
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', agent_type: 'claude', cost_usd: 1.0, input_tokens: 3000, output_tokens: 1000 })

    const result = getEfficiencyComparison('all', 7, 'all', '2026-03-08', '2026-03-14')
    expect(result).toHaveProperty('current')
    expect(result).toHaveProperty('previous')
    expect(Array.isArray(result.current)).toBe(true)
    expect(Array.isArray(result.previous)).toBe(true)

    expect(result.current).toHaveLength(1)
    expect(result.current[0].cost).toBeCloseTo(1.0)
    expect(result.previous).toHaveLength(1)
    expect(result.previous[0].cost).toBeCloseTo(2.0)
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getEfficiencyComparison('all', 7)
    expect(result.current).toHaveLength(0)
    expect(result.previous).toHaveLength(0)
  })
})
