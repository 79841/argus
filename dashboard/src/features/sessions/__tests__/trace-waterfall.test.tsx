import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TraceWaterfall } from '@/features/sessions/components/trace-waterfall'
import type { SessionDetailEvent } from '@/shared/lib/queries'

vi.mock('@/shared/lib/format', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    formatDuration: (v: number) => `${v}ms`,
    formatTime: (v: string) => v,
    shortenModel: (v: string) => v,
  }
})

vi.mock('@/lib/trace-waterfall', () => ({
  groupEventsForWaterfall: (events: SessionDetailEvent[]) => {
    if (events.length === 0) return []
    return [
      {
        promptId: 'p1',
        startTime: events[0].timestamp,
        events,
        cost: events.reduce((s, e) => s + (e.cost_usd || 0), 0),
      },
    ]
  },
  calculateTimeScale: (events: SessionDetailEvent[]) => {
    if (events.length === 0) return { startMs: 0, totalMs: 0 }
    const start = new Date(events[0].timestamp).getTime()
    const end = new Date(events[events.length - 1].timestamp).getTime() + 1000
    return { startMs: start, totalMs: end - start }
  },
  calculateBarPosition: () => ({ left: 10, width: 50 }),
}))

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
  prompt_id: 'p1',
  body: '',
  ...overrides,
})

describe('TraceWaterfall', () => {
  it('이벤트가 없을 때 "이벤트 없음"을 표시한다', () => {
    render(<TraceWaterfall events={[]} />)
    expect(screen.getByText('이벤트 없음')).toBeInTheDocument()
  })

  it('이벤트가 있을 때 헤더 컬럼을 렌더링한다', () => {
    const events = [makeEvent()]
    render(<TraceWaterfall events={events} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Cost')).toBeInTheDocument()
  })

  it('그룹 헤더를 렌더링한다', () => {
    const events = [makeEvent()]
    render(<TraceWaterfall events={events} />)
    // 첫 번째 그룹 헤더 #1
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('첫 번째 그룹은 기본적으로 펼쳐진 상태이다', () => {
    const events = [makeEvent({ event_name: 'api_request' })]
    render(<TraceWaterfall events={events} />)
    // 이벤트 레이블이 보여야 함
    expect(screen.getByText(/claude-opus-4-6/)).toBeInTheDocument()
  })

  it('그룹 헤더 클릭 시 이벤트 목록이 접힌다', () => {
    const events = [makeEvent({ event_name: 'api_request' })]
    render(<TraceWaterfall events={events} />)

    const groupHeader = screen.getByText('#1').closest('button')!
    fireEvent.click(groupHeader)
    // 접히면 이벤트 레이블이 사라져야 함
    expect(screen.queryByText(/claude-opus-4-6/)).not.toBeInTheDocument()
  })

  it('tool_result 성공 이벤트의 레이블을 표시한다', () => {
    const events = [makeEvent({ event_name: 'tool_result', tool_name: 'bash', tool_success: 1 })]
    render(<TraceWaterfall events={events} />)
    expect(screen.getByText('bash')).toBeInTheDocument()
  })

  it('tool_result 실패 이벤트에 [FAIL] 레이블을 표시한다', () => {
    const events = [makeEvent({ event_name: 'tool_result', tool_name: 'bash', tool_success: 0 })]
    render(<TraceWaterfall events={events} />)
    expect(screen.getByText(/bash \[FAIL\]/)).toBeInTheDocument()
  })

  it('user_prompt 이벤트 레이블을 표시한다', () => {
    const events = [makeEvent({ event_name: 'user_prompt' })]
    render(<TraceWaterfall events={events} />)
    expect(screen.getByText('User Prompt')).toBeInTheDocument()
  })
})
