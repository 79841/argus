import { describe, it, expect } from 'vitest'
import type { SessionDetailEvent } from '@/shared/lib/queries'
import { computeModelCostBreakdown } from '../lib/session-model-cost'

const makeEvent = (overrides: Partial<SessionDetailEvent> = {}): SessionDetailEvent => ({
  timestamp: '2025-06-01T10:00:00.000Z',
  event_name: 'api_request',
  prompt_id: '',
  model: 'claude-sonnet-4-6',
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 0,
  cost_usd: 0.01,
  duration_ms: 1000,
  tool_name: '',
  tool_success: null,
  body: '',
  ...overrides,
})

describe('computeModelCostBreakdown', () => {
  it('빈 이벤트에서 빈 배열을 반환한다', () => {
    expect(computeModelCostBreakdown([])).toEqual([])
  })

  it('api_request 이벤트만 필터링한다', () => {
    const events = [
      makeEvent({ event_name: 'api_request', cost_usd: 0.10 }),
      makeEvent({ event_name: 'tool_result', cost_usd: 0.05 }),
      makeEvent({ event_name: 'user_prompt', cost_usd: 0.02 }),
    ]
    const result = computeModelCostBreakdown(events)
    expect(result.length).toBe(1)
    expect(result[0].request_count).toBe(1)
    expect(result[0].cost).toBe(0.10)
  })

  it('모델별로 그룹화하여 비용, 토큰, 요청 수를 집계한다', () => {
    const events = [
      makeEvent({ model: 'claude-sonnet-4-6', cost_usd: 0.10, input_tokens: 1000, output_tokens: 500 }),
      makeEvent({ model: 'claude-sonnet-4-6', cost_usd: 0.15, input_tokens: 1500, output_tokens: 700 }),
      makeEvent({ model: 'claude-opus-4-6', cost_usd: 0.50, input_tokens: 2000, output_tokens: 1000 }),
    ]
    const result = computeModelCostBreakdown(events)
    expect(result.length).toBe(2)

    const sonnet = result.find(r => r.model === 'claude-sonnet-4-6')!
    expect(sonnet.cost).toBeCloseTo(0.25, 4)
    expect(sonnet.request_count).toBe(2)
    expect(sonnet.input_tokens).toBe(2500)
    expect(sonnet.output_tokens).toBe(1200)

    const opus = result.find(r => r.model === 'claude-opus-4-6')!
    expect(opus.cost).toBeCloseTo(0.50, 4)
    expect(opus.request_count).toBe(1)
  })

  it('비율을 올바르게 계산한다', () => {
    const events = [
      makeEvent({ model: 'model-a', cost_usd: 0.75 }),
      makeEvent({ model: 'model-b', cost_usd: 0.25 }),
    ]
    const result = computeModelCostBreakdown(events)
    const modelA = result.find(r => r.model === 'model-a')!
    const modelB = result.find(r => r.model === 'model-b')!
    expect(modelA.percentage).toBeCloseTo(75, 1)
    expect(modelB.percentage).toBeCloseTo(25, 1)
  })

  it('비용 내림차순으로 정렬한다', () => {
    const events = [
      makeEvent({ model: 'cheap', cost_usd: 0.01 }),
      makeEvent({ model: 'expensive', cost_usd: 0.50 }),
      makeEvent({ model: 'mid', cost_usd: 0.10 }),
    ]
    const result = computeModelCostBreakdown(events)
    expect(result[0].model).toBe('expensive')
    expect(result[1].model).toBe('mid')
    expect(result[2].model).toBe('cheap')
  })

  it('빈 model을 unknown으로 처리한다', () => {
    const events = [
      makeEvent({ model: '', cost_usd: 0.10 }),
    ]
    const result = computeModelCostBreakdown(events)
    expect(result.length).toBe(1)
    expect(result[0].model).toBe('unknown')
  })

  it('총 비용이 0이면 비율도 0이다', () => {
    const events = [
      makeEvent({ model: 'model-a', cost_usd: 0 }),
      makeEvent({ model: 'model-b', cost_usd: 0 }),
    ]
    const result = computeModelCostBreakdown(events)
    expect(result.length).toBe(2)
    expect(result[0].percentage).toBe(0)
    expect(result[1].percentage).toBe(0)
  })
})
