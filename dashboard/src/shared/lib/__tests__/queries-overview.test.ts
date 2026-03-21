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

const {
  getOverviewStats,
  getOverviewDelta,
  getAllTimeStats,
  getAgentTodaySummaries,
  getIngestStatus,
} = await import('../queries/overview')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getOverviewStats', () => {
  it('빈 DB에서 기본값을 반환한다', () => {
    const stats = getOverviewStats('all')
    expect(stats.total_sessions).toBe(0)
    expect(stats.total_cost).toBe(0)
    expect(stats.total_requests).toBe(0)
    expect(stats.cache_hit_rate).toBe(0)
  })

  it('오늘 데이터만 집계한다 (과거 데이터 제외)', () => {
    const today = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000 * 2).toISOString()
    insertApiRequest(testDb, { timestamp: today, session_id: 'today-sess', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: yesterday, session_id: 'old-sess', cost_usd: 1.0 })

    const stats = getOverviewStats('all')
    expect(stats.total_requests).toBe(1)
    expect(stats.total_cost).toBeCloseTo(0.5)
  })

  it('agent_type 필터가 동작한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { timestamp: now, agent_type: 'claude', session_id: 's1', cost_usd: 0.3 })
    insertApiRequest(testDb, { timestamp: now, agent_type: 'codex', session_id: 's2', cost_usd: 0.1 })

    const claudeStats = getOverviewStats('claude')
    expect(claudeStats.total_requests).toBe(1)
    expect(claudeStats.total_cost).toBeCloseTo(0.3)

    const allStats = getOverviewStats('all')
    expect(allStats.total_requests).toBe(2)
  })

  it('cache_hit_rate를 올바르게 계산한다', () => {
    const now = new Date().toISOString()
    // 1000 input + 500 cache_read → cache_hit_rate = 500/1500
    insertApiRequest(testDb, { timestamp: now, input_tokens: 1000, cache_read_tokens: 500 })

    const stats = getOverviewStats('all')
    expect(stats.cache_hit_rate).toBeCloseTo(500 / 1500, 5)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2', cost_usd: 0.3 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', session_id: 's3', cost_usd: 0.1 })

    const stats = getOverviewStats('all', 'all', '2026-03-12', '2026-03-17')
    expect(stats.total_requests).toBe(1)
    expect(stats.total_cost).toBeCloseTo(0.3)
  })

  it('project 필터가 동작한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { timestamp: now, project_name: 'project-a', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: now, project_name: 'project-b', session_id: 's2', cost_usd: 0.2 })

    const stats = getOverviewStats('all', 'project-a')
    expect(stats.total_requests).toBe(1)
    expect(stats.total_cost).toBeCloseTo(0.5)
  })
})

describe('getOverviewDelta', () => {
  it('빈 DB에서 null delta를 반환한다', () => {
    const delta = getOverviewDelta('all')
    expect(delta.cost_delta_pct).toBeNull()
    expect(delta.sessions_delta_pct).toBeNull()
  })
})

describe('getAllTimeStats', () => {
  it('전체 기간 비용과 토큰을 합산한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-01-01T00:00:00Z', cost_usd: 1.0, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-02-01T00:00:00Z', cost_usd: 2.0, input_tokens: 2000, output_tokens: 1000 })

    const stats = getAllTimeStats('all')
    expect(stats.total_cost).toBeCloseTo(3.0)
    expect(stats.total_tokens).toBe(4500)
  })

  it('빈 DB에서 0을 반환한다', () => {
    const stats = getAllTimeStats('all')
    expect(stats.total_cost).toBe(0)
    expect(stats.total_tokens).toBe(0)
  })
})

describe('getAgentTodaySummaries', () => {
  it('오늘 에이전트별 요약을 반환한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { timestamp: now, agent_type: 'claude', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: now, agent_type: 'claude', session_id: 's1', cost_usd: 0.3 })
    insertApiRequest(testDb, { timestamp: now, agent_type: 'codex', session_id: 's2', cost_usd: 0.1 })

    const summaries = getAgentTodaySummaries()
    expect(summaries.length).toBeGreaterThanOrEqual(2)

    const claude = summaries.find(s => s.agent_type === 'claude')
    expect(claude).toBeDefined()
    expect(claude!.today_cost).toBeCloseTo(0.8)
    expect(claude!.today_requests).toBe(2)
  })
})

describe('getIngestStatus', () => {
  it('에이전트별 수신 상태를 반환한다', () => {
    const now = new Date().toISOString()
    insertApiRequest(testDb, { timestamp: now, agent_type: 'claude' })
    insertApiRequest(testDb, { timestamp: now, agent_type: 'codex' })

    const status = getIngestStatus()
    expect(status.length).toBeGreaterThanOrEqual(2)

    const claude = status.find(s => s.agent_type === 'claude')
    expect(claude).toBeDefined()
    expect(claude!.today_count).toBe(1)
    expect(claude!.total_count).toBe(1)
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    const status = getIngestStatus()
    expect(status).toHaveLength(0)
  })
})
