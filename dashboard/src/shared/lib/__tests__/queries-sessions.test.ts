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

const { getSessions, getSessionDetail, getSessionSummary, getModelUsage } = await import('../queries/sessions')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getSessions', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getSessions('all')).toHaveLength(0)
  })

  it('세션별로 집계된 데이터를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.5, input_tokens: 1000 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:01:00Z', session_id: 's1', cost_usd: 0.3, input_tokens: 800 })

    const sessions = getSessions('all')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].session_id).toBe('s1')
    expect(sessions[0].cost).toBeCloseTo(0.8)
    expect(sessions[0].request_count).toBe(2)
    expect(sessions[0].input_tokens).toBe(1800)
  })

  it('여러 세션을 최신순으로 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1' })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2' })

    const sessions = getSessions('all')
    expect(sessions[0].session_id).toBe('s2')
    expect(sessions[1].session_id).toBe('s1')
  })

  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's2' })

    const claudeSessions = getSessions('claude')
    expect(claudeSessions).toHaveLength(1)
    expect(claudeSessions[0].agent_type).toBe('claude')
  })

  it('멀티 모델 세션에서 모든 모델을 comma로 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', model: 'claude-sonnet-4-6' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:01:00Z', session_id: 's1', model: 'claude-opus-4-6' })

    const sessions = getSessions('all')
    expect(sessions).toHaveLength(1)
    const models = sessions[0].model.split(',')
    expect(models).toContain('claude-sonnet-4-6')
    expect(models).toContain('claude-opus-4-6')
  })

  it('wall-clock duration을 계산한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', duration_ms: 5000 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:10Z', session_id: 's1', duration_ms: 8000 })

    const sessions = getSessions('all')
    // wall-clock 10초 = 10000ms, API 합산(13000)이 아님
    expect(sessions[0].duration_ms).toBe(10000)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1' })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2' })

    const sessions = getSessions('all', 'all', '2026-03-13', '2026-03-17')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].session_id).toBe('s2')
  })

  it('limit 파라미터가 동작한다', () => {
    for (let i = 0; i < 5; i++) {
      insertApiRequest(testDb, { session_id: `sess-${i}` })
    }

    const sessions = getSessions('all', 'all', undefined, undefined, 3)
    expect(sessions.length).toBeLessThanOrEqual(3)
  })
})

describe('getSessionDetail', () => {
  it('세션의 모든 이벤트를 타임스탬프 오름차순으로 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', prompt_id: 'p1' })
    insertToolResult(testDb, { timestamp: '2026-03-14T10:00:05Z', session_id: 's1' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:10Z', session_id: 's1', prompt_id: 'p2' })

    const events = getSessionDetail('s1', testDb)
    expect(events).toHaveLength(3)
    expect(events[0].event_name).toBe('api_request')
    expect(events[1].event_name).toBe('tool_result')
    expect(events[2].event_name).toBe('api_request')
  })

  it('다른 세션의 이벤트는 포함하지 않는다', () => {
    insertApiRequest(testDb, { session_id: 's1' })
    insertApiRequest(testDb, { session_id: 's2' })

    const events = getSessionDetail('s1', testDb)
    expect(events).toHaveLength(1)
  })

  it('존재하지 않는 세션에서 빈 배열을 반환한다', () => {
    const events = getSessionDetail('nonexistent', testDb)
    expect(events).toHaveLength(0)
  })
})

describe('getSessionSummary', () => {
  it('세션 요약 정보를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:01:00Z', session_id: 's1', cost_usd: 0.3, input_tokens: 800 })
    insertToolResult(testDb, { session_id: 's1' })

    const summary = getSessionSummary('s1', testDb)
    expect(summary).not.toBeNull()
    expect(summary!.session_id).toBe('s1')
    expect(summary!.total_cost).toBeCloseTo(0.8)
    expect(summary!.request_count).toBe(2)
    expect(summary!.tool_count).toBe(1)
  })

  it('존재하지 않는 세션에서 null을 반환한다', () => {
    const summary = getSessionSummary('nonexistent', testDb)
    expect(summary).toBeNull()
  })
})

describe('getModelUsage', () => {
  it('모델별 사용 통계를 반환한다', () => {
    insertApiRequest(testDb, { model: 'claude-sonnet-4-6', cost_usd: 0.1 })
    insertApiRequest(testDb, { model: 'claude-sonnet-4-6', cost_usd: 0.2 })
    insertApiRequest(testDb, { model: 'claude-opus-4-6', cost_usd: 0.5 })

    const usage = getModelUsage('all')
    expect(usage.length).toBeGreaterThanOrEqual(2)

    const sonnet = usage.find(u => u.model === 'claude-sonnet-4-6')
    expect(sonnet).toBeDefined()
    expect(sonnet!.request_count).toBe(2)
    expect(sonnet!.cost).toBeCloseTo(0.3)
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getModelUsage('all')).toHaveLength(0)
  })
})
