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

const { getHighCostSessions, getModelCostEfficiency } = await import('../queries/insights')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getHighCostSessions', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getHighCostSessions(7, 10, testDb)
    expect(result).toEqual([])
  })

  it('비용 내림차순으로 세션을 반환한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { session_id: 'sess-cheap', cost_usd: 0.01, timestamp: now })
    insertApiRequest(testDb, { session_id: 'sess-expensive', cost_usd: 0.50, timestamp: now })
    insertApiRequest(testDb, { session_id: 'sess-mid', cost_usd: 0.10, timestamp: now })

    const result = getHighCostSessions(7, 10, testDb)
    expect(result.length).toBe(3)
    expect(result[0].session_id).toBe('sess-expensive')
    expect(result[1].session_id).toBe('sess-mid')
    expect(result[2].session_id).toBe('sess-cheap')
  })

  it('opus 모델에 expensive_model 원인을 태깅한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, {
      session_id: 'sess-opus',
      model: 'claude-opus-4-20250514',
      cost_usd: 0.50,
      timestamp: now,
    })

    const result = getHighCostSessions(7, 10, testDb)
    expect(result.length).toBe(1)
    expect(result[0].causes).toContain('expensive_model')
  })

  it('도구 호출 15회 이상이면 many_tool_calls를 태깅한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { session_id: 'sess-tools', cost_usd: 0.10, timestamp: now })
    for (let i = 0; i < 15; i++) {
      insertToolResult(testDb, { session_id: 'sess-tools', tool_name: `tool-${i}`, timestamp: now })
    }

    const result = getHighCostSessions(7, 10, testDb)
    expect(result.length).toBe(1)
    expect(result[0].causes).toContain('many_tool_calls')
  })

  it('요청 10회 이상이면 many_requests를 태깅한다', () => {
    const now = new Date().toISOString()
    for (let i = 0; i < 10; i++) {
      insertApiRequest(testDb, { session_id: 'sess-many', cost_usd: 0.01, timestamp: now })
    }

    const result = getHighCostSessions(7, 10, testDb)
    expect(result.length).toBe(1)
    expect(result[0].causes).toContain('many_requests')
  })

  it('캐시 미사용 + 입력 토큰 10000 초과 시 no_cache를 태깅한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, {
      session_id: 'sess-nocache',
      cost_usd: 0.10,
      input_tokens: 15000,
      cache_read_tokens: 0,
      timestamp: now,
    })

    const result = getHighCostSessions(7, 10, testDb)
    expect(result.length).toBe(1)
    expect(result[0].causes).toContain('no_cache')
  })

  it('limit 파라미터가 동작한다', () => {
    const now = new Date().toISOString()
    for (let i = 0; i < 5; i++) {
      insertApiRequest(testDb, { session_id: `sess-${i}`, cost_usd: 0.01 * (i + 1), timestamp: now })
    }

    const result = getHighCostSessions(7, 2, testDb)
    expect(result.length).toBe(2)
  })
})

describe('getModelCostEfficiency', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getModelCostEfficiency(7, testDb)
    expect(result).toEqual([])
  })

  it('모델별 효율성 메트릭을 반환한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { model: 'claude-sonnet-4-6', cost_usd: 0.01, timestamp: now })
    insertApiRequest(testDb, { model: 'claude-sonnet-4-6', cost_usd: 0.02, timestamp: now })
    insertApiRequest(testDb, { model: 'claude-opus-4-6', cost_usd: 0.50, timestamp: now })

    const result = getModelCostEfficiency(7, testDb)
    expect(result.length).toBe(2)
    expect(result[0].model).toBe('claude-opus-4-6')
    expect(result[0].total_cost).toBe(0.50)
    expect(result[1].model).toBe('claude-sonnet-4-6')
    expect(result[1].request_count).toBe(2)
  })

  it('cost_per_1k_tokens를 올바르게 계산한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, {
      model: 'claude-sonnet-4-6',
      cost_usd: 0.10,
      input_tokens: 500,
      output_tokens: 500,
      timestamp: now,
    })

    const result = getModelCostEfficiency(7, testDb)
    expect(result.length).toBe(1)
    // cost_per_1k_tokens = (avg_cost / avg_total_tokens) * 1000
    // = (0.10 / 1000) * 1000 = 0.10
    expect(result[0].cost_per_1k_tokens).toBeCloseTo(0.10, 4)
  })
})
