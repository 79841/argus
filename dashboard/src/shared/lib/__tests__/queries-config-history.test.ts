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
  it('빈 DB에서 기본값을 반환한다', () => {
    const result = getConfigCompareStats('2026-03-14', 7)
    expect(result.before.avg_cost).toBe(0)
    expect(result.before.request_count).toBe(0)
    expect(result.after).toEqual({ avg_cost: 0, cache_rate: 0, tool_fail_rate: 0, request_count: 0 })
  })

  it('기준일 이전/이후 기간을 올바르게 분리한다', () => {
    // 변경 전: 2026-03-08 ~ 2026-03-13
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', cost_usd: 2.0, input_tokens: 1000 })
    insertApiRequest(testDb, { timestamp: '2026-03-12T10:00:00Z', cost_usd: 1.5, input_tokens: 800 })

    // 변경 후: 2026-03-14 ~ 2026-03-20
    insertApiRequest(testDb, { timestamp: '2026-03-16T10:00:00Z', cost_usd: 0.5, input_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-18T10:00:00Z', cost_usd: 0.3, input_tokens: 400 })

    const result = getConfigCompareStats('2026-03-14', 7)

    expect(result.before.request_count).toBe(2)
    expect(result.before.avg_cost).toBeCloseTo(1.75, 1)

    expect(result.after.request_count).toBe(2)
    expect(result.after.avg_cost).toBeCloseTo(0.4, 1)
  })

  it('도구 실패율을 올바르게 계산한다', () => {
    // 변경 전 도구 결과: 2번 성공, 1번 실패 → fail rate = 1/3
    insertToolResult(testDb, { timestamp: '2026-03-10T10:00:00Z', tool_success: 1 })
    insertToolResult(testDb, { timestamp: '2026-03-11T10:00:00Z', tool_success: 1 })
    insertToolResult(testDb, { timestamp: '2026-03-12T10:00:00Z', tool_success: 0 })

    // 변경 후: 모두 성공 → fail rate = 0
    insertToolResult(testDb, { timestamp: '2026-03-16T10:00:00Z', tool_success: 1 })
    insertToolResult(testDb, { timestamp: '2026-03-17T10:00:00Z', tool_success: 1 })

    const result = getConfigCompareStats('2026-03-14', 7)
    expect(result.before.tool_fail_rate).toBeCloseTo(1 / 3, 5)
    expect(result.after.tool_fail_rate).toBe(0)
  })

  it('캐시 히트율을 올바르게 계산한다', () => {
    // 변경 후: 1000 input + 500 cache_read → 33% cache hit
    insertApiRequest(testDb, { timestamp: '2026-03-16T10:00:00Z', input_tokens: 1000, cache_read_tokens: 500 })

    const result = getConfigCompareStats('2026-03-14', 7)
    expect(result.after.cache_rate).toBeCloseTo(500 / 1500, 5)
  })
})
