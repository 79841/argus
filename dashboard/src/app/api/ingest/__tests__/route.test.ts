import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/lib/db'
import type { OtlpLogsRequest, KeyValue } from '@/lib/ingest-utils'

// Mock getDb to return in-memory database
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
  return new Request('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mkAttr = (key: string, value: string): KeyValue => ({
  key, value: { stringValue: value },
})

const mkIntAttr = (key: string, value: number): KeyValue => ({
  key, value: { intValue: value },
})

const mkDoubleAttr = (key: string, value: number): KeyValue => ({
  key, value: { doubleValue: value },
})

const mkBoolAttr = (key: string, value: boolean): KeyValue => ({
  key, value: { boolValue: value },
})

const mkPayload = (
  serviceName: string,
  eventAttrs: KeyValue[],
  resourceAttrs: KeyValue[] = [],
): OtlpLogsRequest => ({
  resourceLogs: [{
    resource: {
      attributes: [
        mkAttr('service.name', serviceName),
        ...resourceAttrs,
      ],
    },
    scopeLogs: [{
      logRecords: [{
        timeUnixNano: '1710000000000000000',
        severityText: 'INFO',
        body: { stringValue: '' },
        attributes: eventAttrs,
      }],
    }],
  }],
})

type AgentLog = {
  agent_type: string
  event_name: string
  session_id: string
  prompt_id: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  reasoning_tokens: number
  cost_usd: number
  duration_ms: number
  speed: string
  tool_name: string
  tool_success: number | null
  body: string
  project_name: string
}

type ToolDetail = {
  tool_name: string
  detail_name: string
  detail_type: string
  agent_type: string
}

const getLogs = (): AgentLog[] =>
  testDb.prepare('SELECT * FROM agent_logs ORDER BY id').all() as AgentLog[]

const getToolDetails = (): ToolDetail[] =>
  testDb.prepare('SELECT * FROM tool_details ORDER BY id').all() as ToolDetail[]

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

// --- B1. Claude Code ---

describe('Claude Code payload', () => {
  it('stores api_request with cost_usd directly', async () => {
    const payload = mkPayload('claude-code', [
      mkAttr('event.name', 'claude_code.api_request'),
      mkAttr('session.id', 'claude-sess-1'),
      mkAttr('prompt.id', 'prompt-1'),
      mkAttr('model', 'claude-sonnet-4-6'),
      mkDoubleAttr('cost_usd', 0.0234),
      mkIntAttr('input_tokens', 1500),
      mkIntAttr('output_tokens', 350),
      mkIntAttr('cache_read_tokens', 800),
      mkIntAttr('duration_ms', 1523),
      mkAttr('speed', 'normal'),
    ])

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(1)

    const logs = getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].agent_type).toBe('claude')
    expect(logs[0].event_name).toBe('api_request')
    expect(logs[0].session_id).toBe('claude-sess-1')
    expect(logs[0].prompt_id).toBe('prompt-1')
    expect(logs[0].model).toBe('claude-sonnet-4-6')
    expect(logs[0].cost_usd).toBeCloseTo(0.0234)
    expect(logs[0].input_tokens).toBe(1500)
    expect(logs[0].output_tokens).toBe(350)
  })
})

// --- B2. Codex ---

describe('Codex payload', () => {
  it('stores sse_event as api_request with calculated cost', async () => {
    const payload = mkPayload('codex-cli', [
      mkAttr('event.name', 'codex.sse_event'),
      mkAttr('event.kind', 'response.completed'),
      mkAttr('conversation.id', 'codex-sess-1'),
      mkAttr('model', 'gpt-4.1'),
      mkIntAttr('input_token_count', 1200),
      mkIntAttr('output_token_count', 450),
      mkIntAttr('cached_token_count', 600),
      mkIntAttr('reasoning_token_count', 100),
      mkIntAttr('duration_ms', 2340),
    ])

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(1)

    const logs = getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].agent_type).toBe('codex')
    expect(logs[0].event_name).toBe('api_request')
    expect(logs[0].session_id).toBe('codex-sess-1')
    expect(logs[0].input_tokens).toBe(1200)
    expect(logs[0].output_tokens).toBe(450)
    expect(logs[0].cache_read_tokens).toBe(600)
    expect(logs[0].reasoning_tokens).toBe(100)
    expect(logs[0].cost_usd).toBeGreaterThan(0)
  })
})

// --- B3. Gemini CLI ---

describe('Gemini CLI payload', () => {
  it('stores api_response as api_request with model normalization', async () => {
    const payload = mkPayload('gemini-cli', [
      mkAttr('event.name', 'gemini_cli.api_response'),
      mkAttr('session.id', 'gemini-sess-1'),
      mkAttr('prompt_id', 'p-123'),
      mkAttr('model', 'models/gemini-2.5-pro'),
      mkIntAttr('input_token_count', 1000),
      mkIntAttr('output_token_count', 300),
      mkIntAttr('cached_content_token_count', 500),
      mkIntAttr('thoughts_token_count', 50),
      mkIntAttr('duration_ms', 1800),
    ])

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(1)

    const logs = getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].agent_type).toBe('gemini')
    expect(logs[0].event_name).toBe('api_request')
    expect(logs[0].model).toBe('gemini-2.5-pro')
    expect(logs[0].prompt_id).toBe('p-123')
    expect(logs[0].reasoning_tokens).toBe(50)
    expect(logs[0].cost_usd).toBeGreaterThan(0)
  })
})

// --- B4. Skip events ---

describe('event filtering', () => {
  it('skips codex.api_request, gemini_cli.api_request, gen_ai.*', async () => {
    const payload: OtlpLogsRequest = {
      resourceLogs: [
        {
          resource: { attributes: [mkAttr('service.name', 'codex-cli')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [mkAttr('event.name', 'codex.api_request')],
          }] }],
        },
        {
          resource: { attributes: [mkAttr('service.name', 'gemini-cli')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [mkAttr('event.name', 'gemini_cli.api_request')],
          }] }],
        },
        {
          resource: { attributes: [mkAttr('service.name', 'gemini-cli')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [mkAttr('event.name', 'gen_ai.client.inference.operation.details')],
          }] }],
        },
      ],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(0)
    expect(getLogs()).toHaveLength(0)
  })
})

// --- B5. Gemini synthetic tool_decision ---

describe('Gemini tool_decision synthesis', () => {
  it('creates both tool_result and tool_decision records', async () => {
    const payload = mkPayload('gemini-cli', [
      mkAttr('event.name', 'gemini_cli.tool_call'),
      mkAttr('session.id', 'g-sess-1'),
      mkAttr('function_name', 'read_file'),
      mkBoolAttr('success', true),
      mkAttr('decision', 'auto_accept'),
      mkIntAttr('duration_ms', 50),
      mkAttr('tool_type', 'native'),
      mkAttr('prompt_id', 'p-1'),
    ])

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(2)

    const logs = getLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].event_name).toBe('tool_result')
    expect(logs[0].tool_name).toBe('read_file')
    expect(logs[1].event_name).toBe('tool_decision')
    expect(logs[1].body).toBe('auto_accept')
  })
})

// --- B6. MCP tool_details ---

describe('MCP tool_details extraction', () => {
  it('creates tool_details for Claude MCP tools', async () => {
    const payload = mkPayload('claude-code', [
      mkAttr('event.name', 'claude_code.tool_result'),
      mkAttr('session.id', 'c-sess-1'),
      mkAttr('tool_name', 'mcp__github__create_issue'),
      mkAttr('success', 'true'),
      mkIntAttr('duration_ms', 120),
    ])

    await POST(mkRequest(payload) as never)

    const details = getToolDetails()
    expect(details).toHaveLength(1)
    expect(details[0].tool_name).toBe('mcp:github')
    expect(details[0].detail_name).toBe('mcp__github__create_issue')
    expect(details[0].detail_type).toBe('mcp')
    expect(details[0].agent_type).toBe('claude')
  })

  it('creates tool_details for Codex MCP tools via mcp_server attr', async () => {
    const payload = mkPayload('codex-cli', [
      mkAttr('event.name', 'codex.tool_result'),
      mkAttr('conversation.id', 'cx-sess-1'),
      mkAttr('tool_name', 'create_issue'),
      mkAttr('mcp_server', 'github'),
      mkAttr('success', 'true'),
    ])

    await POST(mkRequest(payload) as never)

    const details = getToolDetails()
    expect(details).toHaveLength(1)
    expect(details[0].agent_type).toBe('codex')
  })

  it('creates tool_details for Gemini MCP tools via tool_type', async () => {
    const payload = mkPayload('gemini-cli', [
      mkAttr('event.name', 'gemini_cli.tool_call'),
      mkAttr('session.id', 'g-sess-1'),
      mkAttr('function_name', 'mcp__slack__send'),
      mkBoolAttr('success', true),
      mkAttr('tool_type', 'mcp'),
    ])

    await POST(mkRequest(payload) as never)

    const details = getToolDetails()
    expect(details).toHaveLength(1)
    expect(details[0].tool_name).toBe('mcp:slack')
    expect(details[0].agent_type).toBe('gemini')
  })
})

// --- B7. Empty payload ---

describe('empty payloads', () => {
  it('handles empty object', async () => {
    const res = await POST(mkRequest({}) as never)
    const json = await res.json()
    expect(json.accepted).toBe(0)
  })

  it('handles empty resourceLogs', async () => {
    const res = await POST(mkRequest({ resourceLogs: [] }) as never)
    const json = await res.json()
    expect(json.accepted).toBe(0)
  })
})

// --- B8. Invalid JSON ---

describe('invalid payload', () => {
  it('returns 400 for unparseable JSON', async () => {
    const req = new Request('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})

// --- B9. Codex project backfill ---

describe('Codex project backfill', () => {
  it('backfills project_name for earlier events in same session', async () => {
    const payload: OtlpLogsRequest = {
      resourceLogs: [{
        resource: { attributes: [mkAttr('service.name', 'codex-cli')] },
        scopeLogs: [{
          logRecords: [
            {
              timeUnixNano: '1710000000000000000',
              attributes: [
                mkAttr('event.name', 'codex.user_prompt'),
                mkAttr('conversation.id', 'cx-sess-bf'),
              ],
            },
            {
              timeUnixNano: '1710000001000000000',
              attributes: [
                mkAttr('event.name', 'codex.tool_result'),
                mkAttr('conversation.id', 'cx-sess-bf'),
                mkAttr('tool_name', 'shell'),
                mkAttr('success', 'true'),
                mkAttr('arguments', '{"command":"ls","workdir":"/home/user/my-project"}'),
              ],
            },
          ],
        }],
      }],
    }

    await POST(mkRequest(payload) as never)

    const logs = getLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].project_name).toBe('my-project')
    expect(logs[1].project_name).toBe('my-project')
  })
})

// --- B10. Multi-agent in single request ---

describe('multi-agent payload', () => {
  it('processes events from all three agents', async () => {
    const payload: OtlpLogsRequest = {
      resourceLogs: [
        {
          resource: { attributes: [mkAttr('service.name', 'claude-code')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [
              mkAttr('event.name', 'claude_code.api_request'),
              mkAttr('session.id', 'c1'),
              mkAttr('model', 'claude-sonnet-4-6'),
              mkDoubleAttr('cost_usd', 0.01),
            ],
          }] }],
        },
        {
          resource: { attributes: [mkAttr('service.name', 'codex-cli')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [
              mkAttr('event.name', 'codex.sse_event'),
              mkAttr('event.kind', 'response.completed'),
              mkAttr('conversation.id', 'cx1'),
              mkAttr('model', 'gpt-4.1'),
              mkIntAttr('input_token_count', 100),
              mkIntAttr('output_token_count', 50),
            ],
          }] }],
        },
        {
          resource: { attributes: [mkAttr('service.name', 'gemini-cli')] },
          scopeLogs: [{ logRecords: [{
            timeUnixNano: '1710000000000000000',
            attributes: [
              mkAttr('event.name', 'gemini_cli.api_response'),
              mkAttr('session.id', 'g1'),
              mkAttr('model', 'gemini-2.5-flash'),
              mkIntAttr('input_token_count', 200),
              mkIntAttr('output_token_count', 100),
            ],
          }] }],
        },
      ],
    }

    const res = await POST(mkRequest(payload) as never)
    const json = await res.json()
    expect(json.accepted).toBe(3)

    const logs = getLogs()
    expect(logs).toHaveLength(3)
    const agents = logs.map((l) => l.agent_type).sort()
    expect(agents).toEqual(['claude', 'codex', 'gemini'])
  })
})
