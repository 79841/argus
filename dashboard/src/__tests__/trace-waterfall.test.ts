import { describe, it, expect } from 'vitest'
import type { SessionDetailEvent } from '@/lib/queries'
import {
  groupEventsForWaterfall,
  calculateTimeScale,
  calculateBarPosition,
} from '@/lib/trace-waterfall'

const makeEvent = (overrides: Partial<SessionDetailEvent> = {}): SessionDetailEvent => ({
  timestamp: '2026-03-16T10:00:00.000Z',
  event_name: 'api_request',
  prompt_id: 'prompt-1',
  model: 'claude-sonnet-4-6',
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 0,
  cost_usd: 0.05,
  duration_ms: 3000,
  tool_name: '',
  tool_success: null,
  ...overrides,
})

describe('groupEventsForWaterfall', () => {
  it('이벤트를 prompt_id 기준으로 그룹핑한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ prompt_id: 'p1', timestamp: '2026-03-16T10:00:00.000Z' }),
      makeEvent({ prompt_id: 'p1', event_name: 'tool_result', timestamp: '2026-03-16T10:00:03.000Z' }),
      makeEvent({ prompt_id: 'p2', timestamp: '2026-03-16T10:00:10.000Z' }),
    ]
    const groups = groupEventsForWaterfall(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].promptId).toBe('p1')
    expect(groups[0].events).toHaveLength(2)
    expect(groups[1].promptId).toBe('p2')
    expect(groups[1].events).toHaveLength(1)
  })

  it('prompt_id가 없는 이벤트를 타임스탬프 기반 키로 그룹핑한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ prompt_id: '', timestamp: '2026-03-16T10:00:00.000Z' }),
      makeEvent({ prompt_id: '', timestamp: '2026-03-16T10:00:05.000Z' }),
    ]
    const groups = groupEventsForWaterfall(events)
    expect(groups).toHaveLength(2)
  })

  it('빈 이벤트 배열을 안전하게 처리한다', () => {
    const groups = groupEventsForWaterfall([])
    expect(groups).toHaveLength(0)
  })

  it('각 그룹에 startTime과 총 비용이 포함된다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ prompt_id: 'p1', cost_usd: 0.10, timestamp: '2026-03-16T10:00:00.000Z' }),
      makeEvent({ prompt_id: 'p1', event_name: 'tool_result', cost_usd: 0, timestamp: '2026-03-16T10:00:03.000Z' }),
    ]
    const groups = groupEventsForWaterfall(events)
    expect(groups[0].startTime).toBe('2026-03-16T10:00:00.000Z')
    expect(groups[0].cost).toBeCloseTo(0.10, 5)
  })

  it('그룹 순서가 이벤트 타임스탬프 순서를 따른다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ prompt_id: 'p2', timestamp: '2026-03-16T10:00:10.000Z' }),
      makeEvent({ prompt_id: 'p1', timestamp: '2026-03-16T10:00:00.000Z' }),
    ]
    const groups = groupEventsForWaterfall(events)
    expect(groups[0].promptId).toBe('p2')
    expect(groups[1].promptId).toBe('p1')
  })
})

describe('calculateTimeScale', () => {
  it('이벤트 배열에서 전체 시간 범위를 계산한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ timestamp: '2026-03-16T10:00:00.000Z', duration_ms: 1000 }),
      makeEvent({ timestamp: '2026-03-16T10:00:05.000Z', duration_ms: 2000 }),
      makeEvent({ timestamp: '2026-03-16T10:00:20.000Z', duration_ms: 500 }),
    ]
    const scale = calculateTimeScale(events)
    expect(scale.startMs).toBe(new Date('2026-03-16T10:00:00.000Z').getTime())
    expect(scale.endMs).toBeGreaterThanOrEqual(new Date('2026-03-16T10:00:20.500Z').getTime())
    expect(scale.totalMs).toBeGreaterThan(0)
  })

  it('이벤트가 1개인 경우 안전하게 처리한다', () => {
    const events: SessionDetailEvent[] = [
      makeEvent({ timestamp: '2026-03-16T10:00:00.000Z', duration_ms: 5000 }),
    ]
    const scale = calculateTimeScale(events)
    expect(scale.totalMs).toBeGreaterThan(0)
  })

  it('빈 배열에서 totalMs가 0인 기본값을 반환한다', () => {
    const scale = calculateTimeScale([])
    expect(scale.totalMs).toBe(0)
    expect(scale.startMs).toBe(0)
    expect(scale.endMs).toBe(0)
  })

  it('duration_ms가 포함된 이벤트의 끝 시간을 올바르게 계산한다', () => {
    const startTs = '2026-03-16T10:00:00.000Z'
    const events: SessionDetailEvent[] = [
      makeEvent({ timestamp: startTs, duration_ms: 10000 }),
    ]
    const scale = calculateTimeScale(events)
    const expectedEnd = new Date(startTs).getTime() + 10000
    expect(scale.endMs).toBeGreaterThanOrEqual(expectedEnd)
  })
})

describe('calculateBarPosition', () => {
  const scale = {
    startMs: new Date('2026-03-16T10:00:00.000Z').getTime(),
    endMs: new Date('2026-03-16T10:00:10.000Z').getTime(),
    totalMs: 10000,
  }

  it('바의 left 위치를 0~100% 범위로 계산한다', () => {
    const event = makeEvent({ timestamp: '2026-03-16T10:00:05.000Z', duration_ms: 1000 })
    const pos = calculateBarPosition(event, scale)
    expect(pos.left).toBeCloseTo(50, 1)
    expect(pos.left).toBeGreaterThanOrEqual(0)
    expect(pos.left).toBeLessThanOrEqual(100)
  })

  it('바의 width를 올바르게 계산한다', () => {
    const event = makeEvent({ timestamp: '2026-03-16T10:00:00.000Z', duration_ms: 5000 })
    const pos = calculateBarPosition(event, scale)
    expect(pos.width).toBeCloseTo(50, 1)
  })

  it('duration_ms가 0인 이벤트에 최소 너비를 적용한다', () => {
    const event = makeEvent({ timestamp: '2026-03-16T10:00:00.000Z', duration_ms: 0 })
    const pos = calculateBarPosition(event, scale)
    expect(pos.width).toBeGreaterThan(0)
  })

  it('totalMs가 0인 경우 안전하게 처리한다', () => {
    const zeroScale = { startMs: 0, endMs: 0, totalMs: 0 }
    const event = makeEvent({ timestamp: '2026-03-16T10:00:00.000Z', duration_ms: 1000 })
    const pos = calculateBarPosition(event, zeroScale)
    expect(pos.left).toBe(0)
    expect(pos.width).toBeGreaterThan(0)
  })

  it('left + width가 100을 초과하지 않는다', () => {
    const event = makeEvent({ timestamp: '2026-03-16T10:00:09.000Z', duration_ms: 5000 })
    const pos = calculateBarPosition(event, scale)
    expect(pos.left + pos.width).toBeLessThanOrEqual(100)
  })
})
