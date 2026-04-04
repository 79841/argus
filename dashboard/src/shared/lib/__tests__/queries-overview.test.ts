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

const { getOverviewStats, getOverviewDelta, getAgentTodaySummaries, getAllTimeStats, getAgentDistribution } =
  await import('../queries/overview')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getOverviewStats', () => {
  it('빈 DB에서 0 값을 반환한다', () => {
    const stats = getOverviewStats('all', 'all', undefined, undefined, '2026-03-14')
    expect(stats.total_sessions).toBe(0)
    expect(stats.total_cost).toBe(0)
    expect(stats.total_requests).toBe(0)
    expect(stats.total_input_tokens).toBe(0)
    expect(stats.total_output_tokens).toBe(0)
    expect(stats.total_cache_read_tokens).toBe(0)
    expect(stats.cache_hit_rate).toBe(0)
  })

  it('세션 수, 비용, 토큰을 정확히 집계한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's1', cost_usd: 0.3, input_tokens: 800, output_tokens: 200 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', session_id: 's2', cost_usd: 0.2, input_tokens: 500, output_tokens: 100 })

    const stats = getOverviewStats('all', 'all', undefined, undefined, '2026-03-14')
    expect(stats.total_sessions).toBe(2)
    expect(stats.total_cost).toBeCloseTo(1.0)
    expect(stats.total_requests).toBe(3)
    expect(stats.total_input_tokens).toBe(2300)
    expect(stats.total_output_tokens).toBe(800)
  })

  it('캐시 히트율을 계산한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', input_tokens: 200, cache_read_tokens: 800 })

    const stats = getOverviewStats('all', 'all', undefined, undefined, '2026-03-14')
    // cache_hit_rate = 800 / (200 + 800) = 0.8
    expect(stats.cache_hit_rate).toBeCloseTo(0.8)
  })

  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.3 })

    const stats = getOverviewStats('claude', 'all', undefined, undefined, '2026-03-14')
    expect(stats.total_sessions).toBe(1)
    expect(stats.total_cost).toBeCloseTo(0.5)
  })

  it('project 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', project_name: 'argus', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', project_name: 'other', cost_usd: 0.3 })

    const stats = getOverviewStats('all', 'argus', undefined, undefined, '2026-03-14')
    expect(stats.total_cost).toBeCloseTo(0.5)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1', cost_usd: 0.1 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', session_id: 's3', cost_usd: 0.9 })

    const stats = getOverviewStats('all', 'all', '2026-03-12', '2026-03-16')
    expect(stats.total_sessions).toBe(1)
    expect(stats.total_cost).toBeCloseTo(0.5)
  })
})

describe('getOverviewDelta', () => {
  it('어제 데이터가 없으면 null delta를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.5 })

    const delta = getOverviewDelta('all', 'all', '2026-03-14')
    expect(delta.cost_delta_pct).toBeNull()
    expect(delta.sessions_delta_pct).toBeNull()
    expect(delta.requests_delta_pct).toBeNull()
  })

  it('전일 대비 변화율을 정확히 계산한다', () => {
    // 어제: 비용 0.5, 1 세션, 1 요청
    insertApiRequest(testDb, { timestamp: '2026-03-13T10:00:00Z', session_id: 's1', cost_usd: 0.5 })
    // 오늘: 비용 1.0, 2 세션, 2 요청 → 100% 증가
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's3', cost_usd: 0.5 })

    const delta = getOverviewDelta('all', 'all', '2026-03-14')
    expect(delta.cost_delta_pct).toBeCloseTo(100)
    expect(delta.sessions_delta_pct).toBeCloseTo(100)
    expect(delta.requests_delta_pct).toBeCloseTo(100)
  })

  it('오늘과 어제 모두 데이터가 없으면 null delta를 반환한다', () => {
    const delta = getOverviewDelta('all', 'all', '2026-03-14')
    expect(delta.cost_delta_pct).toBeNull()
    expect(delta.sessions_delta_pct).toBeNull()
    expect(delta.requests_delta_pct).toBeNull()
    expect(delta.cache_rate_delta_pct).toBeNull()
  })
})

describe('getAgentTodaySummaries', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const summaries = getAgentTodaySummaries('2026-03-14')
    expect(summaries).toHaveLength(0)
  })

  it('에이전트 타입별로 그룹화하여 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'claude', cost_usd: 0.3 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', agent_type: 'codex', cost_usd: 0.2 })

    const summaries = getAgentTodaySummaries('2026-03-14')
    expect(summaries).toHaveLength(2)

    const claude = summaries.find(s => s.agent_type === 'claude')
    expect(claude).toBeDefined()
    expect(claude!.today_cost).toBeCloseTo(0.8)
    expect(claude!.today_requests).toBe(2)

    const codex = summaries.find(s => s.agent_type === 'codex')
    expect(codex).toBeDefined()
    expect(codex!.today_cost).toBeCloseTo(0.2)
    expect(codex!.today_requests).toBe(1)
  })

  it('다른 날의 데이터는 포함하지 않는다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-13T10:00:00Z', agent_type: 'claude' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex' })

    const summaries = getAgentTodaySummaries('2026-03-14')
    expect(summaries).toHaveLength(1)
    expect(summaries[0].agent_type).toBe('codex')
  })
})

describe('getAllTimeStats', () => {
  it('빈 DB에서 0 값을 반환한다', () => {
    const stats = getAllTimeStats('all')
    expect(stats.total_cost).toBe(0)
    expect(stats.total_tokens).toBe(0)
  })

  it('전체 기간의 비용과 토큰을 집계한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500, cache_read_tokens: 200 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', cost_usd: 0.3, input_tokens: 800, output_tokens: 300, cache_read_tokens: 100 })

    const stats = getAllTimeStats('all')
    expect(stats.total_cost).toBeCloseTo(0.8)
    // total_tokens = (1000+500+200) + (800+300+100) = 2900
    expect(stats.total_tokens).toBe(2900)
  })

  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { agent_type: 'claude', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { agent_type: 'codex', cost_usd: 0.3, input_tokens: 800, output_tokens: 300 })

    const stats = getAllTimeStats('claude')
    expect(stats.total_cost).toBeCloseTo(0.5)
    expect(stats.total_tokens).toBe(1500)
  })

  it('project 필터가 동작한다', () => {
    insertApiRequest(testDb, { project_name: 'argus', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { project_name: 'other', cost_usd: 0.3, input_tokens: 800, output_tokens: 300 })

    const stats = getAllTimeStats('all', 'argus')
    expect(stats.total_cost).toBeCloseTo(0.5)
    expect(stats.total_tokens).toBe(1500)
  })
})

describe('getAgentDistribution', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const dist = getAgentDistribution(undefined, undefined, '2026-03-14')
    expect(dist).toHaveLength(0)
  })

  it('에이전트별 세션, 토큰, 비용을 정확히 분배한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'claude', session_id: 's2', cost_usd: 0.3, input_tokens: 800, output_tokens: 200 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', agent_type: 'codex', session_id: 's3', cost_usd: 0.2, input_tokens: 500, output_tokens: 100 })

    const dist = getAgentDistribution(undefined, undefined, '2026-03-14')
    expect(dist).toHaveLength(2)

    const claude = dist.find(d => d.agent_type === 'claude')
    expect(claude).toBeDefined()
    expect(claude!.sessions).toBe(2)
    expect(claude!.tokens).toBe(2500) // (1000+500) + (800+200)
    expect(claude!.cost).toBeCloseTo(0.8)

    const codex = dist.find(d => d.agent_type === 'codex')
    expect(codex).toBeDefined()
    expect(codex!.sessions).toBe(1)
    expect(codex!.tokens).toBe(600) // 500+100
    expect(codex!.cost).toBeCloseTo(0.2)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.3 })

    const dist = getAgentDistribution('2026-03-12', '2026-03-16')
    expect(dist).toHaveLength(1)
    expect(dist[0].agent_type).toBe('codex')
  })

  it('비용 내림차순으로 정렬한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's1', cost_usd: 0.1 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's2', cost_usd: 0.9 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'gemini', session_id: 's3', cost_usd: 0.5 })

    const dist = getAgentDistribution(undefined, undefined, '2026-03-14')
    expect(dist[0].agent_type).toBe('claude')
    expect(dist[1].agent_type).toBe('gemini')
    expect(dist[2].agent_type).toBe('codex')
  })
})
