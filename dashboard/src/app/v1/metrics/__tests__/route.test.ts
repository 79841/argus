import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/lib/db'

let testDb: Database.Database

vi.mock('@/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { POST } = await import('../route')

const mkRequest = (body: unknown): Request => {
  return new Request('http://localhost:9845/v1/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type AgentLog = {
  agent_type: string
  event_name: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cost_usd: number
  duration_ms: number
  tool_name: string
  body: string
}

const getLogs = (): AgentLog[] =>
  testDb.prepare('SELECT * FROM agent_logs ORDER BY id').all() as AgentLog[]

const getApiRequestLogs = (): AgentLog[] =>
  testDb.prepare("SELECT * FROM agent_logs WHERE event_name = 'api_request' ORDER BY id").all() as AgentLog[]

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('Gemini metrics deduplication (PER-19)', () => {
  it('should NOT create api_request events from token metrics', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'gemini-cli' } },
          ],
        },
        scopeMetrics: [{
          metrics: [
            {
              name: 'gemini_cli.token.input.count',
              sum: { dataPoints: [{ value: 500, attributes: [
                { key: 'session.id', value: { stringValue: 'g-sess-1' } },
                { key: 'model', value: { stringValue: 'gemini-2.5-pro' } },
              ] }] },
            },
            {
              name: 'gemini_cli.token.output.count',
              sum: { dataPoints: [{ value: 200, attributes: [
                { key: 'session.id', value: { stringValue: 'g-sess-1' } },
                { key: 'model', value: { stringValue: 'gemini-2.5-pro' } },
              ] }] },
            },
            {
              name: 'gemini_cli.api.request.duration',
              sum: { dataPoints: [{ value: 1500, attributes: [
                { key: 'session.id', value: { stringValue: 'g-sess-1' } },
                { key: 'model', value: { stringValue: 'gemini-2.5-pro' } },
              ] }] },
            },
          ],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    // Token/duration metrics should NOT produce api_request events
    const apiRequests = getApiRequestLogs()
    expect(apiRequests).toHaveLength(0)
  })

  it('should still store tool_result and session_start events', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'gemini-cli' } },
          ],
        },
        scopeMetrics: [{
          metrics: [
            {
              name: 'gemini_cli.tool_call.duration',
              sum: { dataPoints: [{ value: 80, attributes: [
                { key: 'session.id', value: { stringValue: 'g-sess-1' } },
                { key: 'function_name', value: { stringValue: 'read_file' } },
              ] }] },
            },
            {
              name: 'gemini_cli.session.count',
              sum: { dataPoints: [{ value: 1, attributes: [
                { key: 'session.id', value: { stringValue: 'g-sess-1' } },
              ] }] },
            },
          ],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    const logs = getLogs()
    const toolResults = logs.filter((l) => l.event_name === 'tool_result')
    const sessionStarts = logs.filter((l) => l.event_name === 'session_start')

    expect(toolResults).toHaveLength(1)
    expect(toolResults[0].tool_name).toBe('read_file')
    expect(sessionStarts).toHaveLength(1)
  })
})

describe('Claude Code metrics (PER-22)', () => {
  it('should store lines_of_code, commit_count, pull_request_count, active_time', async () => {
    const metrics = [
      { name: 'claude_code.lines_of_code.count', value: 150 },
      { name: 'claude_code.commit.count', value: 3 },
      { name: 'claude_code.pull_request.count', value: 1 },
      { name: 'claude_code.active_time.total', value: 3600000 },
    ]

    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'claude-code' } },
          ],
        },
        scopeMetrics: [{
          metrics: metrics.map((m) => ({
            name: m.name,
            sum: { dataPoints: [{ value: m.value, attributes: [
              { key: 'session.id', value: { stringValue: 'cc-sess-1' } },
              { key: 'model', value: { stringValue: 'claude-sonnet-4-6' } },
            ] }] },
          })),
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(4)

    const logs = getLogs()
    expect(logs).toHaveLength(4)

    const eventNames = logs.map((l) => l.event_name).sort()
    expect(eventNames).toEqual(['active_time', 'commit_count', 'lines_of_code', 'pull_request_count'])

    expect(logs.every((l) => l.agent_type === 'claude')).toBe(true)
  })

  it('should skip unknown claude_code metrics', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'claude-code' } },
          ],
        },
        scopeMetrics: [{
          metrics: [{
            name: 'claude_code.unknown_metric',
            sum: { dataPoints: [{ value: 42, attributes: [
              { key: 'session.id', value: { stringValue: 'cc-sess-1' } },
            ] }] },
          }],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(0)
    expect(getLogs()).toHaveLength(0)
  })

  it('should store active_time value in duration_ms', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'claude-code' } },
          ],
        },
        scopeMetrics: [{
          metrics: [{
            name: 'claude_code.active_time.total',
            sum: { dataPoints: [{ value: 7200000, attributes: [
              { key: 'session.id', value: { stringValue: 'cc-sess-1' } },
            ] }] },
          }],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(1)

    const logs = getLogs()
    expect(logs[0].duration_ms).toBe(7200000)
    expect(logs[0].event_name).toBe('active_time')
  })

  it('should detect agent_type from service.name', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'some-claude-service' } },
          ],
        },
        scopeMetrics: [{
          metrics: [{
            name: 'claude_code.lines_of_code.count',
            sum: { dataPoints: [{ value: 10, attributes: [] }] },
          }],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(1)
    expect(getLogs()[0].agent_type).toBe('claude')
  })
})

describe('Codex metrics (PER-22)', () => {
  it('should skip Codex metrics (no known spec)', async () => {
    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'codex-cli' } },
          ],
        },
        scopeMetrics: [{
          metrics: [{
            name: 'codex.some_metric',
            sum: { dataPoints: [{ value: 42, attributes: [
              { key: 'session.id', value: { stringValue: 'codex-sess-1' } },
            ] }] },
          }],
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(0)
    expect(getLogs()).toHaveLength(0)
  })
})

describe('Gemini misc metrics filtering (PER-35)', () => {
  it('should skip token.usage, lines.changed, file.operation.count and other misc metrics', async () => {
    const miscMetrics = [
      'gemini_cli.token.usage',
      'gemini_cli.lines.changed',
      'gemini_cli.file.operation.count',
      'gemini_cli.api.request.count',
      'gemini_cli.keychain.availability.count',
      'gemini_cli.token_storage.type.count',
    ]

    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'gemini-cli' } },
          ],
        },
        scopeMetrics: [{
          metrics: miscMetrics.map((name) => ({
            name,
            sum: { dataPoints: [{ value: 42, attributes: [
              { key: 'session.id', value: { stringValue: 'g-sess-1' } },
            ] }] },
          })),
        }],
      }],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()

    expect(json.accepted).toBe(0)
    expect(getLogs()).toHaveLength(0)
  })
})
