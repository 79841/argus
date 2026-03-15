import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/lib/db'

let db: ReturnType<typeof Database>

const seedTestData = () => {
  const insert = db.prepare(`
    INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id, model, input_tokens, output_tokens, cache_read_tokens, cost_usd, duration_ms, project_name, tool_name, tool_success)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    // Session A - 2 prompts, multiple events
    insert.run('2026-03-16T10:00:00Z', 'claude', 'user_prompt', 'session-a', 'prompt-1', '', 0, 0, 0, 0, 0, 'project-x', '', null)
    insert.run('2026-03-16T10:00:01Z', 'claude', 'api_request', 'session-a', 'prompt-1', 'claude-sonnet-4-6', 5000, 2000, 1000, 0.10, 3000, 'project-x', '', null)
    insert.run('2026-03-16T10:00:04Z', 'claude', 'tool_result', 'session-a', 'prompt-1', '', 0, 0, 0, 0, 500, 'project-x', 'Read', 1)
    insert.run('2026-03-16T10:00:05Z', 'claude', 'api_request', 'session-a', 'prompt-1', 'claude-sonnet-4-6', 6000, 2500, 3000, 0.15, 2500, 'project-x', '', null)
    insert.run('2026-03-16T10:01:00Z', 'claude', 'user_prompt', 'session-a', 'prompt-2', '', 0, 0, 0, 0, 0, 'project-x', '', null)
    insert.run('2026-03-16T10:01:01Z', 'claude', 'api_request', 'session-a', 'prompt-2', 'claude-sonnet-4-6', 8000, 3000, 5000, 0.20, 4000, 'project-x', '', null)
    insert.run('2026-03-16T10:01:05Z', 'claude', 'tool_result', 'session-a', 'prompt-2', '', 0, 0, 0, 0, 200, 'project-x', 'Write', 0)

    // Session B - 1 prompt, minimal events
    insert.run('2026-03-16T11:00:00Z', 'codex', 'api_request', 'session-b', 'prompt-x', 'gpt-4.1', 3000, 1000, 0, 0.05, 1500, 'project-y', '', null)
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

describe('getSessionSummary', () => {
  it('세션 요약 통계를 반환한다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('session-a', db)

    expect(summary).not.toBeNull()
    expect(summary).toHaveProperty('total_cost')
    expect(summary).toHaveProperty('input_tokens')
    expect(summary).toHaveProperty('output_tokens')
    expect(summary).toHaveProperty('cache_read_tokens')
    expect(summary).toHaveProperty('duration_ms')
    expect(summary).toHaveProperty('request_count')
    expect(summary).toHaveProperty('tool_count')
  })

  it('api_request 이벤트 기준으로 토큰/비용을 집계한다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('session-a', db)

    expect(summary).not.toBeNull()
    expect(summary!.input_tokens).toBe(5000 + 6000 + 8000)
    expect(summary!.output_tokens).toBe(2000 + 2500 + 3000)
    expect(summary!.cache_read_tokens).toBe(1000 + 3000 + 5000)
    expect(summary!.total_cost).toBeCloseTo(0.10 + 0.15 + 0.20, 5)
    expect(summary!.request_count).toBe(3)
  })

  it('tool_result 이벤트 수를 tool_count로 반환한다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('session-a', db)

    expect(summary).not.toBeNull()
    expect(summary!.tool_count).toBe(2)
  })

  it('duration_ms는 첫 이벤트와 마지막 이벤트 사이 시간이다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('session-a', db)

    expect(summary).not.toBeNull()
    expect(summary!.duration_ms).toBeGreaterThan(0)
  })

  it('존재하지 않는 세션 ID에 대해 null을 반환한다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('non-existent-session', db)

    expect(summary).toBeNull()
  })

  it('agent_type과 model을 포함한다', async () => {
    const { getSessionSummary } = await import('@/lib/queries')
    const summary = await getSessionSummary('session-a', db)

    expect(summary).not.toBeNull()
    expect(summary!.agent_type).toBe('claude')
    expect(summary!.model).toContain('claude-sonnet-4-6')
  })
})

describe('getSessionDetail', () => {
  it('세션의 모든 이벤트를 시간 순으로 반환한다', async () => {
    const { getSessionDetail } = await import('@/lib/queries')
    const events = await getSessionDetail('session-a', db)

    expect(events.length).toBeGreaterThan(0)
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(events[i - 1].timestamp).getTime())
    }
  })

  it('이벤트에 필수 필드가 포함된다', async () => {
    const { getSessionDetail } = await import('@/lib/queries')
    const events = await getSessionDetail('session-a', db)

    expect(events.length).toBeGreaterThan(0)
    const ev = events[0]
    expect(ev).toHaveProperty('timestamp')
    expect(ev).toHaveProperty('event_name')
    expect(ev).toHaveProperty('prompt_id')
    expect(ev).toHaveProperty('model')
    expect(ev).toHaveProperty('input_tokens')
    expect(ev).toHaveProperty('output_tokens')
    expect(ev).toHaveProperty('cache_read_tokens')
    expect(ev).toHaveProperty('cost_usd')
    expect(ev).toHaveProperty('duration_ms')
    expect(ev).toHaveProperty('tool_name')
    expect(ev).toHaveProperty('tool_success')
  })

  it('존재하지 않는 세션은 빈 배열을 반환한다', async () => {
    const { getSessionDetail } = await import('@/lib/queries')
    const events = await getSessionDetail('non-existent-session', db)

    expect(events).toEqual([])
  })
})
