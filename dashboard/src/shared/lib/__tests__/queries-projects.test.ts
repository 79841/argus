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

const { getProjects, getProjectCosts, getProjectDetailStats, getProjectDailyCosts, getProjectComparison } = await import('../queries/projects')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getProjects', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    const result = getProjects()
    expect(result).toEqual([])
  })

  it('고유 프로젝트별 세션 수와 비용을 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's1', project_name: 'argus', cost_usd: 0.03 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', session_id: 's2', project_name: 'other', cost_usd: 0.10 })

    const result = getProjects()
    expect(result).toHaveLength(2)

    const argus = result.find(r => r.project_name === 'argus')
    expect(argus).toBeDefined()
    expect(argus!.session_count).toBe(1)
    expect(argus!.total_cost).toBeCloseTo(0.08)

    const other = result.find(r => r.project_name === 'other')
    expect(other).toBeDefined()
    expect(other!.session_count).toBe(1)
    expect(other!.total_cost).toBeCloseTo(0.10)
  })

  it('빈 project_name을 제외한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', project_name: '', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's2', project_name: 'argus', cost_usd: 0.03 })

    const result = getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].project_name).toBe('argus')
  })
})

describe('getProjectCosts', () => {
  it('agent_type 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', agent_type: 'claude', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's2', agent_type: 'codex', project_name: 'argus', cost_usd: 0.03 })

    const result = getProjectCosts('claude')
    expect(result).toHaveLength(1)
    expect(result[0].total_cost).toBeCloseTo(0.05)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-10T10:00:00Z', session_id: 's1', project_name: 'argus', cost_usd: 0.01 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's2', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-20T10:00:00Z', session_id: 's3', project_name: 'argus', cost_usd: 0.10 })

    const result = getProjectCosts('all', '2026-03-13', '2026-03-15')
    expect(result).toHaveLength(1)
    expect(result[0].total_cost).toBeCloseTo(0.05)
  })
})

describe('getProjectDetailStats', () => {
  it('프로젝트 상세 통계를 반환한다', () => {
    const t1 = '2026-03-10T10:00:00Z'
    const t2 = '2026-03-12T15:00:00Z'
    insertApiRequest(testDb, { timestamp: t1, session_id: 's1', agent_type: 'claude', model: 'claude-sonnet-4-6', project_name: 'argus', cost_usd: 0.05, input_tokens: 1000, output_tokens: 500, cache_read_tokens: 200 })
    insertApiRequest(testDb, { timestamp: t2, session_id: 's1', agent_type: 'claude', model: 'claude-sonnet-4-6', project_name: 'argus', cost_usd: 0.04, input_tokens: 800, output_tokens: 400, cache_read_tokens: 100 })
    insertApiRequest(testDb, { timestamp: t2, session_id: 's2', agent_type: 'codex', model: 'gpt-4.1', project_name: 'argus', cost_usd: 0.02, input_tokens: 500, output_tokens: 200, cache_read_tokens: 0 })

    const stats = getProjectDetailStats('argus', testDb)

    expect(stats.project_name).toBe('argus')
    expect(stats.total_sessions).toBe(2)
    expect(stats.total_requests).toBe(3)
    expect(stats.total_cost).toBeCloseTo(0.11)
    expect(stats.total_input_tokens).toBe(2300)
    expect(stats.total_output_tokens).toBe(1100)
    expect(stats.total_cache_read_tokens).toBe(300)
    expect(stats.first_activity).toBe(t1)
    expect(stats.last_activity).toBe(t2)
    expect(stats.top_model).toBe('claude-sonnet-4-6')
  })

  it('존재하지 않는 프로젝트에 대해 0을 반환한다', () => {
    const stats = getProjectDetailStats('nonexistent', testDb)

    expect(stats.project_name).toBe('nonexistent')
    expect(stats.total_sessions).toBe(0)
    expect(stats.total_requests).toBe(0)
    expect(stats.total_cost).toBe(0)
    expect(stats.total_input_tokens).toBe(0)
    expect(stats.total_output_tokens).toBe(0)
    expect(stats.agent_breakdown).toHaveLength(0)
  })

  it('agent_breakdown이 올바르게 채워진다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', agent_type: 'claude', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's1', agent_type: 'claude', project_name: 'argus', cost_usd: 0.02 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', session_id: 's2', agent_type: 'codex', project_name: 'argus', cost_usd: 0.01 })

    const stats = getProjectDetailStats('argus', testDb)

    expect(stats.agent_breakdown).toHaveLength(2)
    const claudeRow = stats.agent_breakdown.find(r => r.agent_type === 'claude')
    const codexRow = stats.agent_breakdown.find(r => r.agent_type === 'codex')
    expect(claudeRow).toBeDefined()
    expect(claudeRow!.cost).toBeCloseTo(0.07)
    expect(claudeRow!.sessions).toBe(1)
    expect(codexRow).toBeDefined()
    expect(codexRow!.cost).toBeCloseTo(0.01)
    expect(codexRow!.sessions).toBe(1)
  })
})

describe('getProjectDailyCosts', () => {
  it('일별 프로젝트 비용 데이터를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T10:00:00Z', session_id: 's2', project_name: 'argus', cost_usd: 0.04 })
    insertApiRequest(testDb, { timestamp: '2026-03-15T11:00:00Z', session_id: 's3', project_name: 'other', cost_usd: 0.02 })

    const result = getProjectDailyCosts(30, testDb)

    expect(result.length).toBeGreaterThan(0)
    const argusRows = result.filter(r => r.project_name === 'argus')
    expect(argusRows.length).toBeGreaterThanOrEqual(1)
    const argusTotal = argusRows.reduce((sum, r) => sum + r.cost, 0)
    expect(argusTotal).toBeCloseTo(0.09)
  })
})

describe('getProjectComparison', () => {
  it('비용 내림차순으로 프로젝트 비교 데이터를 반환한다', () => {
    insertApiRequest(testDb, { timestamp: '2026-03-14T10:00:00Z', session_id: 's1', agent_type: 'claude', model: 'claude-sonnet-4-6', project_name: 'argus', cost_usd: 0.10 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T11:00:00Z', session_id: 's2', agent_type: 'claude', model: 'claude-sonnet-4-6', project_name: 'argus', cost_usd: 0.05 })
    insertApiRequest(testDb, { timestamp: '2026-03-14T12:00:00Z', session_id: 's3', agent_type: 'codex', model: 'gpt-4.1', project_name: 'other', cost_usd: 0.02 })

    const result = getProjectComparison(testDb)

    expect(result).toHaveLength(2)
    expect(result[0].project_name).toBe('argus')
    expect(result[0].total_cost).toBeCloseTo(0.15)
    expect(result[0].session_count).toBe(2)
    expect(result[0].request_count).toBe(2)
    expect(result[0].top_model).toBe('claude-sonnet-4-6')
    expect(result[1].project_name).toBe('other')
    expect(result[1].total_cost).toBeCloseTo(0.02)
  })
})
