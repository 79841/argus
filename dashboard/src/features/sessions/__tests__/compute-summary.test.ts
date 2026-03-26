import { describe, it, expect } from 'vitest'
import { computeSummary } from '@/features/sessions/lib/compute-summary'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'

const makeSession = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  session_id: 'sess-test',
  agent_type: 'claude',
  model: 'claude-opus-4-6',
  started_at: '2026-03-21T10:00:00Z',
  last_activity: '2026-03-21T10:05:00Z',
  duration_ms: 120000,
  cost: 0.05,
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 200,
  request_count: 3,
  project_name: 'argus',
  ...overrides,
})

const makeEvent = (overrides: Partial<SessionDetailEvent> = {}): SessionDetailEvent => ({
  event_name: 'api_request',
  timestamp: '2026-03-21T10:00:00Z',
  model: 'claude-opus-4-6',
  input_tokens: 100,
  output_tokens: 50,
  cache_read_tokens: 0,
  cost_usd: 0.01,
  duration_ms: 1000,
  tool_name: '',
  tool_success: null,
  prompt_id: 'prompt-1',
  body: '',
  ...overrides,
})

describe('computeSummary', () => {
  it('api_request 이벤트의 비용 합계를 계산한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', cost_usd: 0.01 }),
      makeEvent({ event_name: 'api_request', cost_usd: 0.02 }),
      makeEvent({ event_name: 'tool_result', cost_usd: 0.99 }),
    ]
    const result = computeSummary(events, session)
    expect(result.totalCost).toBeCloseTo(0.03)
  })

  it('api_request 이벤트의 입력 토큰 합계를 계산한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 100, cache_read_tokens: 0 }),
      makeEvent({ event_name: 'api_request', input_tokens: 200, cache_read_tokens: 0 }),
    ]
    const result = computeSummary(events, session)
    expect(result.inputTokens).toBe(300)
  })

  it('api_request 이벤트의 출력 토큰 합계를 계산한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', output_tokens: 50 }),
      makeEvent({ event_name: 'api_request', output_tokens: 75 }),
    ]
    const result = computeSummary(events, session)
    expect(result.outputTokens).toBe(125)
  })

  it('캐시 읽기 토큰 합계를 계산한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 100, cache_read_tokens: 50 }),
      makeEvent({ event_name: 'api_request', input_tokens: 200, cache_read_tokens: 100 }),
    ]
    const result = computeSummary(events, session)
    expect(result.cacheReadTokens).toBe(150)
  })

  it('캐시율을 올바르게 계산한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 100, cache_read_tokens: 100 }),
    ]
    const result = computeSummary(events, session)
    expect(result.cacheRate).toBe(50)
  })

  it('캐시가 없으면 cacheRate는 0이다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 100, cache_read_tokens: 0 }),
    ]
    const result = computeSummary(events, session)
    expect(result.cacheRate).toBe(0)
  })

  it('api_request 이벤트 수를 requestCount로 반환한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request' }),
      makeEvent({ event_name: 'api_request' }),
      makeEvent({ event_name: 'tool_result' }),
    ]
    const result = computeSummary(events, session)
    expect(result.requestCount).toBe(2)
  })

  it('tool_result 이벤트 수를 toolCallCount로 반환한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request' }),
      makeEvent({ event_name: 'tool_result' }),
      makeEvent({ event_name: 'tool_result' }),
    ]
    const result = computeSummary(events, session)
    expect(result.toolCallCount).toBe(2)
  })

  it('session의 duration_ms를 wallTime으로 반환한다', () => {
    const session = makeSession({ duration_ms: 300000 })
    const result = computeSummary([], session)
    expect(result.wallTime).toBe(300000)
  })

  it('session의 agent_type과 model을 반환한다', () => {
    const session = makeSession({ agent_type: 'gemini', model: 'gemini-2.5-pro' })
    const result = computeSummary([], session)
    expect(result.agentType).toBe('gemini')
    expect(result.model).toBe('gemini-2.5-pro')
  })

  it('이벤트가 없으면 모든 수치가 0이다', () => {
    const session = makeSession()
    const result = computeSummary([], session)
    expect(result.totalCost).toBe(0)
    expect(result.inputTokens).toBe(0)
    expect(result.outputTokens).toBe(0)
    expect(result.cacheReadTokens).toBe(0)
    expect(result.cacheRate).toBe(0)
    expect(result.requestCount).toBe(0)
    expect(result.toolCallCount).toBe(0)
  })
})
