import { describe, it, expect } from 'vitest'
import { computeModelCostBreakdown } from '@/features/sessions/lib/session-model-cost'
import type { SessionDetailEvent } from '@/shared/lib/queries'

const makeEvent = (overrides: Partial<SessionDetailEvent> = {}): SessionDetailEvent => ({
  timestamp: '2026-03-16T10:00:00Z',
  event_name: 'api_request',
  prompt_id: 'p1',
  model: 'claude-sonnet-4-6',
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 0,
  cost_usd: 0.01,
  duration_ms: 1000,
  tool_name: '',
  tool_success: null,
  ...overrides,
})

describe('computeModelCostBreakdown', () => {
  it('모델별 비용을 집계한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ model: 'claude-opus-4-6', cost_usd: 0.5, input_tokens: 5000, output_tokens: 1000 }),
      makeEvent({ model: 'claude-opus-4-6', cost_usd: 0.3, input_tokens: 3000, output_tokens: 600 }),
      makeEvent({ model: 'claude-sonnet-4-6', cost_usd: 0.1, input_tokens: 1000, output_tokens: 200 }),
    ]

    const result = computeModelCostBreakdown(events)

    expect(result.length).toBe(2)
    const opus = result.find(r => r.model === 'claude-opus-4-6')
    expect(opus).toBeDefined()
    expect(opus!.cost).toBeCloseTo(0.8)
    expect(opus!.request_count).toBe(2)
    expect(opus!.input_tokens).toBe(8000)
    expect(opus!.output_tokens).toBe(1600)
  })

  it('비용 내림차순으로 정렬한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ model: 'cheap-model', cost_usd: 0.01 }),
      makeEvent({ model: 'expensive-model', cost_usd: 1.0 }),
      makeEvent({ model: 'mid-model', cost_usd: 0.5 }),
    ]

    const result = computeModelCostBreakdown(events)

    expect(result[0].model).toBe('expensive-model')
    expect(result[1].model).toBe('mid-model')
    expect(result[2].model).toBe('cheap-model')
  })

  it('percentage가 합계 100%이다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ model: 'model-a', cost_usd: 0.6 }),
      makeEvent({ model: 'model-b', cost_usd: 0.3 }),
      makeEvent({ model: 'model-c', cost_usd: 0.1 }),
    ]

    const result = computeModelCostBreakdown(events)
    const totalPct = result.reduce((sum, r) => sum + r.percentage, 0)

    expect(totalPct).toBeCloseTo(100, 1)
  })

  it('api_request 이벤트만 처리한다 (tool_result 제외)', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ event_name: 'api_request', model: 'claude-sonnet-4-6', cost_usd: 0.1 }),
      makeEvent({ event_name: 'tool_result', model: 'claude-sonnet-4-6', cost_usd: 0 }),
      makeEvent({ event_name: 'user_prompt', model: '', cost_usd: 0 }),
    ]

    const result = computeModelCostBreakdown(events)

    expect(result.length).toBe(1)
    expect(result[0].model).toBe('claude-sonnet-4-6')
    expect(result[0].request_count).toBe(1)
  })

  it('빈 이벤트 배열에 빈 결과 반환', () => {
    const result = computeModelCostBreakdown([])
    expect(result).toEqual([])
  })

  it('모델이 1개인 경우 percentage 100%', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ model: 'claude-sonnet-4-6', cost_usd: 0.5 }),
      makeEvent({ model: 'claude-sonnet-4-6', cost_usd: 0.3 }),
    ]

    const result = computeModelCostBreakdown(events)

    expect(result.length).toBe(1)
    expect(result[0].percentage).toBeCloseTo(100, 1)
  })
})
