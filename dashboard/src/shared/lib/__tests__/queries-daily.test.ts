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
    const result = getDailyStats('all', 30)
    expect(result).toEqual([])
  })

  it('날짜별로 그룹화하여 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', cost_usd: 0.05, input_tokens: 1000, output_tokens: 500 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T14:00:00Z', session_id: 's1', cost_usd: 0.03, input_tokens: 800, output_tokens: 400 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T09:00:00Z', session_id: 's2', cost_usd: 0.10, input_tokens: 500, output_tokens: 200 })

    const result = getDailyStats('claude', 30, 'all', '2026-03-14', '2026-03-15')
    expect(result).toHaveLength(2)

    const mar14 = result.find(r => r.date === '2026-03-14')
    expect(mar14).toBeDefined()
    expect(mar14!.cost).toBeCloseTo(0.08)
    expect(mar14!.input_tokens).toBe(1800)
    expect(mar14!.sessions).toBe(1)

    const mar15 = result.find(r => r.date === '2026-03-15')
    expect(mar15).toBeDefined()
    expect(mar15!.cost).toBeCloseTo(0.10)
  })

  it('agent_type=all일 때 에이전트별로 분리한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.03 })

    const result = getDailyStats('all', 30, 'all', '2026-03-14', '2026-03-14')
    expect(result).toHaveLength(2)

    const agentTypes = result.map(r => r.agent_type)
    expect(agentTypes).toContain('claude')
    expect(agentTypes).toContain('codex')

    const claude = result.find(r => r.agent_type === 'claude')
    expect(claude!.cost).toBeCloseTo(0.05)
    const codex = result.find(r => r.agent_type === 'codex')
    expect(codex!.cost).toBeCloseTo(0.03)
  })

  it('특정 agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', agent_type: 'claude', session_id: 's1', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', agent_type: 'codex', session_id: 's2', cost_usd: 0.03 })

    const result = getDailyStats('claude', 30, 'all', '2026-03-14', '2026-03-14')
    expect(result).toHaveLength(1)
    expect(result[0].cost).toBeCloseTo(0.05)
    expect(result.every(r => r.agent_type === 'claude')).toBe(true)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1', cost_usd: 0.01 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', session_id: 's3', cost_usd: 0.10 })

    const result = getDailyStats('all', 30, 'all', '2026-03-13', '2026-03-15')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-14')
    expect(result[0].cost).toBeCloseTo(0.05)
  })

  it('project 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's2', project_name: 'other', cost_usd: 0.03 })

    const result = getDailyStats('all', 30, 'argus', '2026-03-14', '2026-03-14')
    expect(result).toHaveLength(1)
    expect(result[0].cost).toBeCloseTo(0.05)
  })
})
