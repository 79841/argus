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

const { getDailyStats } = await import('../queries/daily')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getDailyStats', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const stats = getDailyStats('all')
    expect(stats).toHaveLength(0)
  })

  it('날짜별로 그룹화된 통계를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.5, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's1', cost_usd: 0.3, input_tokens: 800, output_tokens: 400 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2', cost_usd: 0.2, input_tokens: 500, output_tokens: 200 })

    const stats = getDailyStats('all', 30)
    expect(stats.length).toBe(2)

    const mar14 = stats.find(s => s.date === '2026-03-14')
    expect(mar14).toBeDefined()
    expect(mar14!.cost).toBeCloseTo(0.8)
    expect(mar14!.input_tokens).toBe(1800)
    expect(mar14!.sessions).toBe(1)

    const mar15 = stats.find(s => s.date === '2026-03-15')
    expect(mar15).toBeDefined()
    expect(mar15!.cost).toBeCloseTo(0.2)
  })

  it('agent_type = all일 때 에이전트별로 분리하여 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.2 })

    const stats = getDailyStats('all', 30)
    expect(stats.length).toBe(2)
    const agentTypes = stats.map(s => s.agent_type)
    expect(agentTypes).toContain('claude')
    expect(agentTypes).toContain('codex')
  })

  it('특정 agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.2 })

    const stats = getDailyStats('claude', 30)
    expect(stats.every(s => s.agent_type === 'claude')).toBe(true)
    expect(stats.length).toBe(1)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2', cost_usd: 0.3 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', session_id: 's3', cost_usd: 0.1 })

    const stats = getDailyStats('all', 30, 'all', '2026-03-12', '2026-03-17')
    expect(stats.length).toBe(1)
    expect(stats[0].date).toBe('2026-03-15')
  })

  it('날짜 오름차순으로 정렬된다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-16T10:00:00Z', session_id: 's1' })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2' })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's3' })

    const stats = getDailyStats('all', 30)
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i].date >= stats[i - 1].date).toBe(true)
    }
  })

  it('project 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', project_name: 'project-a', cost_usd: 0.5 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2', project_name: 'project-b', cost_usd: 0.2 })

    const stats = getDailyStats('all', 30, 'project-a')
    expect(stats.length).toBe(1)
    expect(stats[0].cost).toBeCloseTo(0.5)
  })
})
