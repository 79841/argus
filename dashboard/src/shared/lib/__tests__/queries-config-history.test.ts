import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'
import { insertApiRequest, insertToolResult } from './test-helpers'

let testDb: Database.Database

vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { getConfigCompareStats } = await import('../queries/config-history')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getConfigCompareStats', () => {
  const changeDate = '2025-06-15'

  it('빈 DB에서 0을 반환한다', () => {
    const result = getConfigCompareStats(changeDate)

    expect(result.before).toEqual({
      avg_cost: 0,
      cache_rate: 0,
      tool_fail_rate: 0,
      request_count: 0,
    })
    expect(result.after).toEqual({
      avg_cost: 0,
      cache_rate: 0,
      tool_fail_rate: 0,
      request_count: 0,
    })
  })

  it('이전 기간에만 데이터가 있으면 이후 기간은 0이다', () => {
    // before period: [2025-06-08, 2025-06-15)
    insertApiRequest(testDb, { timestamp: '2025-06-10T12:00:00Z', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2025-06-12T12:00:00Z', cost_usd: 0.03 })

    const result = getConfigCompareStats(changeDate)

    expect(result.before.avg_cost).toBeCloseTo(0.04)
    expect(result.before.request_count).toBe(2)
    expect(result.after.avg_cost).toBe(0)
    expect(result.after.request_count).toBe(0)
  })

  it('이후 기간에만 데이터가 있으면 이전 기간은 0이다', () => {
    // after period: [2025-06-15, 2025-06-22)
    insertApiRequest(testDb, { timestamp: '2025-06-15T12:00:00Z', cost_usd: 0.10 })
    insertApiRequest(testDb, { timestamp: '2025-06-18T12:00:00Z', cost_usd: 0.06 })

    const result = getConfigCompareStats(changeDate)

    expect(result.before.avg_cost).toBe(0)
    expect(result.before.request_count).toBe(0)
    expect(result.after.avg_cost).toBeCloseTo(0.08)
    expect(result.after.request_count).toBe(2)
  })

  it('양쪽 기간에 데이터가 있으면 올바르게 비교한다', () => {
    // before period
    insertApiRequest(testDb, { timestamp: '2025-06-10T12:00:00Z', cost_usd: 0.02 })
    insertApiRequest(testDb, { timestamp: '2025-06-12T12:00:00Z', cost_usd: 0.04 })

    // after period
    insertApiRequest(testDb, { timestamp: '2025-06-16T12:00:00Z', cost_usd: 0.10 })

    const result = getConfigCompareStats(changeDate)

    expect(result.before.avg_cost).toBeCloseTo(0.03)
    expect(result.before.request_count).toBe(2)
    expect(result.after.avg_cost).toBeCloseTo(0.10)
    expect(result.after.request_count).toBe(1)
  })

  it('cache_rate를 올바르게 계산한다', () => {
    // cache_rate = cache_read_tokens / (input_tokens + cache_read_tokens)
    // 200 / (800 + 200) = 0.2
    insertApiRequest(testDb, {
      timestamp: '2025-06-10T12:00:00Z',
      input_tokens: 800,
      cache_read_tokens: 200,
    })

    const result = getConfigCompareStats(changeDate)

    expect(result.before.cache_rate).toBeCloseTo(0.2)
  })

  it('tool_fail_rate를 올바르게 계산한다', () => {
    // before period: 1 fail out of 3 = 1/3
    insertToolResult(testDb, { timestamp: '2025-06-10T12:00:00Z', tool_success: 1 })
    insertToolResult(testDb, { timestamp: '2025-06-11T12:00:00Z', tool_success: 0 })
    insertToolResult(testDb, { timestamp: '2025-06-12T12:00:00Z', tool_success: 1 })

    // after period: 2 fails out of 2 = 1.0
    insertToolResult(testDb, { timestamp: '2025-06-16T12:00:00Z', tool_success: 0 })
    insertToolResult(testDb, { timestamp: '2025-06-17T12:00:00Z', tool_success: 0 })

    const result = getConfigCompareStats(changeDate)

    expect(result.before.tool_fail_rate).toBeCloseTo(1 / 3)
    expect(result.after.tool_fail_rate).toBeCloseTo(1.0)
  })
})
