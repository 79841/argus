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

const { getProjectDetailStats, getProjectDailyCosts, getProjectComparison } = await import('../queries')

const insertLog = (db: Database.Database) => db.prepare(`
  INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
    model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
    reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getProjectDetailStats (PER-34)', () => {
  it('프로젝트 상세 통계를 반환한다', async () => {
    const t1 = '2026-03-10T10:00:00.000Z'
    const t2 = '2026-03-12T15:00:00.000Z'
    const ins = insertLog(testDb)
    ins.run(t1, 'claude', 'api_request', 's-1', 'p1', 'claude-sonnet-4-6', 1000, 500, 200, 0, 0, 0.05, 1000, '', null, 'argus')
    ins.run(t2, 'claude', 'api_request', 's-1', 'p2', 'claude-sonnet-4-6', 800, 400, 100, 0, 0, 0.04, 800, '', null, 'argus')
    ins.run(t2, 'codex', 'api_request', 's-2', 'p3', 'gpt-4.1', 500, 200, 0, 0, 0, 0.02, 500, '', null, 'argus')

    const stats = await getProjectDetailStats('argus', testDb)

    expect(stats.project_name).toBe('argus')
    expect(stats.total_sessions).toBe(2)
    expect(stats.total_requests).toBe(3)
    expect(stats.total_cost).toBeCloseTo(0.11, 5)
    expect(stats.total_input_tokens).toBe(2300)
    expect(stats.total_output_tokens).toBe(1100)
    expect(stats.total_cache_read_tokens).toBe(300)
    expect(stats.first_activity).toBe(t1)
    expect(stats.last_activity).toBe(t2)
  })

  it('agent_breakdown에 에이전트별 비용/세션이 포함된다', async () => {
    const t1 = '2026-03-10T10:00:00.000Z'
    const ins = insertLog(testDb)
    ins.run(t1, 'claude', 'api_request', 'c-1', 'p1', 'claude-sonnet-4-6', 1000, 500, 0, 0, 0, 0.05, 1000, '', null, 'argus')
    ins.run(t1, 'claude', 'api_request', 'c-1', 'p2', 'claude-sonnet-4-6', 500, 200, 0, 0, 0, 0.02, 500, '', null, 'argus')
    ins.run(t1, 'codex', 'api_request', 'cx-1', 'p3', 'gpt-4.1', 200, 100, 0, 0, 0, 0.01, 200, '', null, 'argus')

    const stats = await getProjectDetailStats('argus', testDb)

    expect(stats.agent_breakdown).toHaveLength(2)
    const claudeRow = stats.agent_breakdown.find(r => r.agent_type === 'claude')
    const codexRow = stats.agent_breakdown.find(r => r.agent_type === 'codex')
    expect(claudeRow).toBeDefined()
    expect(claudeRow!.cost).toBeCloseTo(0.07, 5)
    expect(claudeRow!.sessions).toBe(1)
    expect(codexRow).toBeDefined()
    expect(codexRow!.cost).toBeCloseTo(0.01, 5)
    expect(codexRow!.sessions).toBe(1)
  })

  it('존재하지 않는 프로젝트에 대해 빈 통계를 반환한다', async () => {
    const stats = await getProjectDetailStats('nonexistent', testDb)

    expect(stats.project_name).toBe('nonexistent')
    expect(stats.total_sessions).toBe(0)
    expect(stats.total_requests).toBe(0)
    expect(stats.total_cost).toBe(0)
    expect(stats.agent_breakdown).toHaveLength(0)
  })
})

describe('getProjectDailyCosts (PER-34)', () => {
  it('일별 프로젝트 비용 데이터를 반환한다', async () => {
    const t1 = '2026-03-10T10:00:00.000Z'
    const t2 = '2026-03-11T10:00:00.000Z'
    const ins = insertLog(testDb)
    ins.run(t1, 'claude', 'api_request', 's-1', 'p1', 'claude-sonnet-4-6', 1000, 500, 0, 0, 0, 0.05, 1000, '', null, 'argus')
    ins.run(t2, 'claude', 'api_request', 's-2', 'p2', 'claude-sonnet-4-6', 800, 400, 0, 0, 0, 0.04, 800, '', null, 'argus')
    ins.run(t2, 'codex', 'api_request', 's-3', 'p3', 'gpt-4.1', 500, 200, 0, 0, 0, 0.02, 500, '', null, 'other-proj')

    const daily = await getProjectDailyCosts(30, testDb)

    expect(daily.length).toBeGreaterThan(0)
    const argusRows = daily.filter(r => r.project_name === 'argus')
    expect(argusRows.length).toBeGreaterThanOrEqual(1)
    const argusTotal = argusRows.reduce((sum, r) => sum + r.cost, 0)
    expect(argusTotal).toBeCloseTo(0.09, 5)
  })
})

describe('getProjectComparison (PER-34)', () => {
  it('프로젝트 비교 데이터를 반환한다', async () => {
    const t1 = '2026-03-10T10:00:00.000Z'
    const ins = insertLog(testDb)
    ins.run(t1, 'claude', 'api_request', 's-1', 'p1', 'claude-sonnet-4-6', 1000, 500, 0, 0, 0, 0.05, 1000, '', null, 'argus')
    ins.run(t1, 'claude', 'api_request', 's-2', 'p2', 'claude-sonnet-4-6', 800, 400, 0, 0, 0, 0.04, 800, '', null, 'argus')
    ins.run(t1, 'codex', 'api_request', 's-3', 'p3', 'gpt-4.1', 500, 200, 0, 0, 0, 0.02, 500, '', null, 'other-proj')

    const comparison = await getProjectComparison(testDb)

    expect(comparison.length).toBeGreaterThan(0)
    const argus = comparison.find(r => r.project_name === 'argus')
    expect(argus).toBeDefined()
    expect(argus!.total_cost).toBeCloseTo(0.09, 5)
    expect(argus!.session_count).toBe(2)
    expect(argus!.request_count).toBe(2)
    expect(argus!.top_model).toBeDefined()
  })
})
