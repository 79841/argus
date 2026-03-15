import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'

let testDb: Database.Database

vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { getSuggestionMetrics } = await import('../queries')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

const insertApiRequest = (
  db: Database.Database,
  overrides: {
    timestamp?: string
    agent_type?: string
    session_id?: string
    model?: string
    input_tokens?: number
    cache_read_tokens?: number
    cost_usd?: number
  } = {}
) => {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
      model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
    VALUES (?, ?, 'api_request', ?, '', ?, ?, 0, ?, 0, 0, ?, 0, '', null)
  `).run(
    overrides.timestamp ?? now,
    overrides.agent_type ?? 'claude',
    overrides.session_id ?? 'sess-1',
    overrides.model ?? 'claude-sonnet',
    overrides.input_tokens ?? 1000,
    overrides.cache_read_tokens ?? 0,
    overrides.cost_usd ?? 0.5
  )
}

const insertToolResult = (
  db: Database.Database,
  overrides: {
    timestamp?: string
    tool_name?: string
    tool_success?: number
  } = {}
) => {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
      model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
    VALUES (?, 'claude', 'tool_result', 'sess-1', '', '', 0, 0, 0, 0, 0, 0, 0, ?, ?)
  `).run(
    overrides.timestamp ?? now,
    overrides.tool_name ?? 'bash',
    overrides.tool_success ?? 1
  )
}

describe('getSuggestionMetrics', () => {
  it('캐시 히트율을 올바르게 계산한다', async () => {
    // 2000 input + 1000 cache_read → 33% cache hit
    insertApiRequest(testDb, { input_tokens: 2000, cache_read_tokens: 1000 })
    const metrics = await getSuggestionMetrics(7)
    expect(metrics.overallCacheRate).toBeCloseTo(1000 / 3000, 5)
  })

  it('도구 실패율을 올바르게 계산한다', async () => {
    insertApiRequest(testDb)
    insertToolResult(testDb, { tool_success: 1 })
    insertToolResult(testDb, { tool_success: 1 })
    insertToolResult(testDb, { tool_success: 0 })
    // 1/3 ≈ 33% 실패율
    const metrics = await getSuggestionMetrics(7)
    expect(metrics.toolFailRate).toBeCloseTo(1 / 3, 5)
  })

  it('빈 데이터에서 안전한 기본값을 반환한다', async () => {
    const metrics = await getSuggestionMetrics(7)
    expect(metrics.overallCacheRate).toBe(0)
    expect(metrics.avgCostPerSession).toBe(0)
    expect(metrics.toolFailRate).toBe(0)
    expect(metrics.totalDailyCost).toBe(0)
    expect(metrics.topFailingTools).toEqual([])
    expect(metrics.modelUsageBreakdown).toEqual([])
  })

  it('고가 모델 사용 비율을 올바르게 계산한다', async () => {
    // 2건 opus(고가), 1건 sonnet
    insertApiRequest(testDb, { model: 'claude-opus-4-6', cost_usd: 2.0, session_id: 'sess-1' })
    insertApiRequest(testDb, { model: 'claude-opus-4-6', cost_usd: 2.0, session_id: 'sess-2' })
    insertApiRequest(testDb, { model: 'claude-sonnet-4-5', cost_usd: 0.3, session_id: 'sess-3' })
    const metrics = await getSuggestionMetrics(7)
    expect(metrics.expensiveModelRatio).toBeCloseTo(2 / 3, 5)
  })

  it('세션 평균 비용을 올바르게 계산한다', async () => {
    insertApiRequest(testDb, { cost_usd: 1.0, session_id: 'sess-a' })
    insertApiRequest(testDb, { cost_usd: 1.0, session_id: 'sess-a' })
    insertApiRequest(testDb, { cost_usd: 3.0, session_id: 'sess-b' })
    // sess-a: $2, sess-b: $3 → avg $2.5
    const metrics = await getSuggestionMetrics(7)
    expect(metrics.avgCostPerSession).toBeCloseTo(2.5, 5)
  })
})
