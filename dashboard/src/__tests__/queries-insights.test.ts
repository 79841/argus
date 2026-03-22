import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/shared/lib/db'

let db: ReturnType<typeof Database>

const seedTestData = () => {
  const insert = db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, model, input_tokens, output_tokens, cache_read_tokens, cost_usd, duration_ms, project_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    // High cost session (expensive model, many requests)
    insert.run('2026-03-16T10:00:00Z', 'claude', 'api_request', 'session-expensive', 'claude-opus-4-6', 50000, 10000, 0, 2.50, 5000, 'project-a')
    insert.run('2026-03-16T10:01:00Z', 'claude', 'api_request', 'session-expensive', 'claude-opus-4-6', 40000, 8000, 0, 2.00, 4000, 'project-a')
    insert.run('2026-03-16T10:02:00Z', 'claude', 'api_request', 'session-expensive', 'claude-opus-4-6', 30000, 6000, 0, 1.50, 3000, 'project-a')

    // Medium cost session (good cache usage)
    insert.run('2026-03-16T11:00:00Z', 'claude', 'api_request', 'session-cached', 'claude-sonnet-4-6', 10000, 5000, 30000, 0.30, 2000, 'project-b')
    insert.run('2026-03-16T11:01:00Z', 'claude', 'api_request', 'session-cached', 'claude-sonnet-4-6', 8000, 4000, 25000, 0.25, 1800, 'project-b')

    // Low cost session (small model)
    insert.run('2026-03-16T12:00:00Z', 'codex', 'api_request', 'session-cheap', 'gpt-4.1-mini', 5000, 2000, 1000, 0.05, 800, 'project-a')

    // Gemini session
    insert.run('2026-03-16T13:00:00Z', 'gemini', 'api_request', 'session-gemini', 'gemini-2.5-pro', 20000, 8000, 5000, 0.80, 3000, 'project-c')
    insert.run('2026-03-16T13:01:00Z', 'gemini', 'api_request', 'session-gemini', 'gemini-2.5-pro', 15000, 6000, 4000, 0.60, 2500, 'project-c')

    // Tool events for expensive session (many tool calls = cause tag)
    for (let i = 0; i < 20; i++) {
      insert.run(`2026-03-16T10:00:${String(i).padStart(2, '0')}Z`, 'claude', 'tool_result', 'session-expensive', '', 0, 0, 0, 0, 100, 'project-a')
    }

  })
  tx()
}

beforeAll(() => {
  db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  seedTestData()
})

afterAll(() => {
  db.close()
})

describe('getHighCostSessions', () => {
  it('비용 상위 세션을 내림차순으로 반환한다', async () => {
    const { getHighCostSessions } = await import('@/shared/lib/queries')
    const sessions = await getHighCostSessions(30, 10, db)

    expect(sessions.length).toBeGreaterThan(0)
    expect(sessions[0].total_cost).toBeGreaterThanOrEqual(sessions[sessions.length - 1].total_cost)
  })

  it('세션별 원인 태그를 포함한다', async () => {
    const { getHighCostSessions } = await import('@/shared/lib/queries')
    const sessions = await getHighCostSessions(30, 10, db)

    for (const s of sessions) {
      expect(s).toHaveProperty('causes')
      expect(Array.isArray(s.causes)).toBe(true)
    }
  })

  it('고비용 세션에 expensive_model 태그가 포함된다', async () => {
    const { getHighCostSessions } = await import('@/shared/lib/queries')
    const sessions = await getHighCostSessions(30, 10, db)

    const expensive = sessions.find(s => s.session_id === 'session-expensive')
    expect(expensive).toBeDefined()
    expect(expensive!.causes).toContain('expensive_model')
  })

  it('다수 도구 호출 세션에 many_tool_calls 태그가 포함된다', async () => {
    const { getHighCostSessions } = await import('@/shared/lib/queries')
    const sessions = await getHighCostSessions(30, 10, db)

    const expensive = sessions.find(s => s.session_id === 'session-expensive')
    expect(expensive).toBeDefined()
    expect(expensive!.causes).toContain('many_tool_calls')
  })

  it('limit 파라미터로 결과 수를 제한한다', async () => {
    const { getHighCostSessions } = await import('@/shared/lib/queries')
    const sessions = await getHighCostSessions(30, 2, db)

    expect(sessions.length).toBeLessThanOrEqual(2)
  })
})

describe('getModelCostEfficiency', () => {
  it('모델별 비용 효율 데이터를 반환한다', async () => {
    const { getModelCostEfficiency } = await import('@/shared/lib/queries')
    const models = await getModelCostEfficiency(30, db)

    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toHaveProperty('model')
    expect(models[0]).toHaveProperty('agent_type')
    expect(models[0]).toHaveProperty('request_count')
    expect(models[0]).toHaveProperty('total_cost')
    expect(models[0]).toHaveProperty('avg_cost_per_request')
    expect(models[0]).toHaveProperty('avg_input_tokens')
    expect(models[0]).toHaveProperty('avg_output_tokens')
    expect(models[0]).toHaveProperty('avg_duration_ms')
    expect(models[0]).toHaveProperty('cost_per_1k_tokens')
  })

  it('비용 내림차순으로 정렬된다', async () => {
    const { getModelCostEfficiency } = await import('@/shared/lib/queries')
    const models = await getModelCostEfficiency(30, db)

    for (let i = 1; i < models.length; i++) {
      expect(models[i - 1].total_cost).toBeGreaterThanOrEqual(models[i].total_cost)
    }
  })

  it('cost_per_1k_tokens가 올바르게 계산된다', async () => {
    const { getModelCostEfficiency } = await import('@/shared/lib/queries')
    const models = await getModelCostEfficiency(30, db)

    for (const m of models) {
      const totalTokens = m.avg_input_tokens + m.avg_output_tokens
      if (totalTokens > 0) {
        const expected = (m.avg_cost_per_request / totalTokens) * 1000
        expect(m.cost_per_1k_tokens).toBeCloseTo(expected, 4)
      }
    }
  })
})

