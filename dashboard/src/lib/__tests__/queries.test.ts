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

const { getToolDetailStats, getSessions, getIngestStatus } = await import('../queries')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getToolDetailStats — prompt_id JOIN (PER-20)', () => {
  it('should not duplicate tokens/cost for tools with empty prompt_id', async () => {
    const now = new Date().toISOString()

    // Insert Codex tool_result events with empty prompt_id
    const insertLog = testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Two tool_result events with empty prompt_id
    insertLog.run(now, 'codex', 'tool_result', 'cx-1', '', 'gpt-4.1', 0, 0, 0, 0, 0, 0, 100, 'shell', 1)
    insertLog.run(now, 'codex', 'tool_result', 'cx-1', '', 'gpt-4.1', 0, 0, 0, 0, 0, 0, 200, 'read_file', 1)

    // One api_request with empty prompt_id (Codex doesn't provide prompt_id)
    insertLog.run(now, 'codex', 'api_request', 'cx-1', '', 'gpt-4.1', 1000, 500, 0, 0, 0, 5.0, 0, '', null)

    const results = await getToolDetailStats('codex', 30)

    // Each tool should NOT get the full $5.00 cost
    // Total cost across all tools should be <= $5.00
    const totalCost = results.reduce((sum, r) => sum + r.total_cost, 0)
    expect(totalCost).toBeLessThanOrEqual(5.0)

    // Specifically, neither tool alone should have the full cost
    for (const tool of results) {
      expect(tool.total_cost).toBeLessThan(5.0)
    }
  })
})

describe('getSessions — multi-model support (PER-60)', () => {
  it('should return all distinct models as comma-separated string when session uses multiple models', async () => {
    const now = new Date().toISOString()
    const insertLog = testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Session with 3 sonnet requests and 1 opus request
    insertLog.run(now, 'claude', 'api_request', 'c-multi', 'p1', 'claude-sonnet-4-6', 100, 50, 0, 0, 0, 0.01, 100, '', null)
    insertLog.run(now, 'claude', 'api_request', 'c-multi', 'p2', 'claude-sonnet-4-6', 100, 50, 0, 0, 0, 0.01, 100, '', null)
    insertLog.run(now, 'claude', 'api_request', 'c-multi', 'p3', 'claude-sonnet-4-6', 100, 50, 0, 0, 0, 0.01, 100, '', null)
    insertLog.run(now, 'claude', 'api_request', 'c-multi', 'p4', 'claude-opus-4-6', 500, 200, 0, 0, 0, 0.10, 500, '', null)

    const sessions = await getSessions('claude')
    expect(sessions).toHaveLength(1)
    const models = sessions[0].model.split(',')
    expect(models).toHaveLength(2)
    expect(models).toContain('claude-sonnet-4-6')
    expect(models).toContain('claude-opus-4-6')
  })
})

describe('getSessions — duration_ms wall-clock (PER-25)', () => {
  it('should compute wall-clock duration from timestamp range, not sum of API durations', async () => {
    const insertLog = testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Session spanning 10 seconds with high API durations
    const t0 = '2026-03-14T10:00:00.000Z'
    const t1 = '2026-03-14T10:00:10.000Z'
    insertLog.run(t0, 'claude', 'api_request', 'c-dur', 'p1', 'claude-sonnet-4-6', 100, 50, 0, 0, 0, 0.01, 5000, '', null)
    insertLog.run(t1, 'claude', 'api_request', 'c-dur', 'p2', 'claude-sonnet-4-6', 100, 50, 0, 0, 0, 0.01, 8000, '', null)

    const sessions = await getSessions('claude')
    expect(sessions).toHaveLength(1)
    // Wall-clock: 10 seconds = 10000ms, NOT sum of API durations (13000ms)
    expect(sessions[0].duration_ms).toBe(10000)
  })
})

describe('getIngestStatus (PER-35)', () => {
  it('should return per-agent last received and today count', async () => {
    const now = new Date().toISOString()
    const insertLog = testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertLog.run(now, 'claude', 'api_request', 'c-1', '', '', 100, 50, 0, 0, 0, 0.01, 0, '', null)
    insertLog.run(now, 'claude', 'user_prompt', 'c-1', '', '', 0, 0, 0, 0, 0, 0, 0, '', null)
    insertLog.run(now, 'codex', 'api_request', 'cx-1', '', '', 100, 50, 0, 0, 0, 0.01, 0, '', null)

    const status = await getIngestStatus()
    expect(status).toHaveLength(2)

    const claude = status.find((s) => s.agent_type === 'claude')
    expect(claude).toBeDefined()
    expect(claude!.today_count).toBe(2)
    expect(claude!.total_count).toBe(2)

    const codex = status.find((s) => s.agent_type === 'codex')
    expect(codex).toBeDefined()
    expect(codex!.today_count).toBe(1)
  })

  it('should return empty array for empty DB', async () => {
    const status = await getIngestStatus()
    expect(status).toHaveLength(0)
  })
})
