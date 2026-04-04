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

const { getImpactCompare, getDailyMetrics, getImpactCompareBatch } = await import('../queries/impact')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getImpactCompare', () => {
  it('데이터가 없으면 빈 메트릭을 반환한다', () => {
    const result = getImpactCompare('2025-06-15', 7)
    expect(result.before.request_count).toBe(0)
    expect(result.after.request_count).toBe(0)
    expect(result.before.avg_cost).toBe(0)
    expect(result.after.avg_cost).toBe(0)
  })

  it('이전/이후 기간을 올바르게 비교한다', () => {
    // Before period: 2025-06-08 to 2025-06-15
    insertApiRequest(testDb, {
      timestamp: '2025-06-10T12:00:00.000Z',
      cost_usd: 0.10,
      input_tokens: 1000,
      output_tokens: 500,
      session_id: 'sess-before',
    })

    // After period: 2025-06-15 to 2025-06-22
    insertApiRequest(testDb, {
      timestamp: '2025-06-17T12:00:00.000Z',
      cost_usd: 0.20,
      input_tokens: 2000,
      output_tokens: 1000,
      session_id: 'sess-after',
    })

    const result = getImpactCompare('2025-06-15', 7)
    expect(result.before.request_count).toBe(1)
    expect(result.before.avg_cost).toBeCloseTo(0.10, 4)
    expect(result.after.request_count).toBe(1)
    expect(result.after.avg_cost).toBeCloseTo(0.20, 4)
  })

  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, {
      timestamp: '2025-06-10T12:00:00.000Z',
      agent_type: 'claude',
      cost_usd: 0.10,
      session_id: 'sess-claude',
    })
    insertApiRequest(testDb, {
      timestamp: '2025-06-10T12:00:00.000Z',
      agent_type: 'codex',
      cost_usd: 0.05,
      session_id: 'sess-codex',
    })

    const claudeResult = getImpactCompare('2025-06-15', 7, 'claude')
    expect(claudeResult.before.request_count).toBe(1)
    expect(claudeResult.before.avg_cost).toBeCloseTo(0.10, 4)

    const codexResult = getImpactCompare('2025-06-15', 7, 'codex')
    expect(codexResult.before.request_count).toBe(1)
    expect(codexResult.before.avg_cost).toBeCloseTo(0.05, 4)
  })
})

describe('getDailyMetrics', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getDailyMetrics('2025-06-01', '2025-06-07')
    expect(result).toEqual([])
  })

  it('날짜 범위 내 일별 데이터를 반환한다', () => {
    insertApiRequest(testDb, {
      timestamp: '2025-06-01T10:00:00.000Z',
      cost_usd: 0.10,
      input_tokens: 1000,
      output_tokens: 500,
    })
    insertApiRequest(testDb, {
      timestamp: '2025-06-02T10:00:00.000Z',
      cost_usd: 0.20,
      input_tokens: 2000,
      output_tokens: 1000,
    })
    insertApiRequest(testDb, {
      timestamp: '2025-06-03T10:00:00.000Z',
      cost_usd: 0.15,
      input_tokens: 1500,
      output_tokens: 750,
    })

    const result = getDailyMetrics('2025-06-01', '2025-06-03')
    expect(result.length).toBe(3)
    expect(result[0].date).toBe('2025-06-01')
    expect(result[1].date).toBe('2025-06-02')
    expect(result[2].date).toBe('2025-06-03')
  })

  it('cache_rate를 올바르게 계산한다', () => {
    insertApiRequest(testDb, {
      timestamp: '2025-06-01T10:00:00.000Z',
      input_tokens: 800,
      cache_read_tokens: 200,
      output_tokens: 500,
      cost_usd: 0.10,
    })

    const result = getDailyMetrics('2025-06-01', '2025-06-01')
    expect(result.length).toBe(1)
    // cache_rate = cache_read / (input + cache_read) * 100 = 200 / (800 + 200) * 100 = 20
    expect(result[0].cache_rate).toBeCloseTo(20, 1)
  })
})

describe('getImpactCompareBatch', () => {
  it('배치로 비교 결과 배열을 반환한다', () => {
    insertApiRequest(testDb, {
      timestamp: '2025-06-10T12:00:00.000Z',
      cost_usd: 0.10,
      session_id: 'sess-1',
    })

    const dates = ['2025-06-15', '2025-06-20']
    const result = getImpactCompareBatch(dates, 7)
    expect(result.length).toBe(2)
    expect(result[0]).toHaveProperty('before')
    expect(result[0]).toHaveProperty('after')
    expect(result[1]).toHaveProperty('before')
    expect(result[1]).toHaveProperty('after')
  })
})
