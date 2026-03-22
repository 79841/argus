import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SessionDetail } from '@/features/sessions/components/session-detail'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'

// 무거운 차트 컴포넌트 mock
vi.mock('@/features/sessions/components/session-model-cost-chart', () => ({
  SessionModelCostChart: () => <div data-testid="model-cost-chart" />,
}))

vi.mock('@/features/sessions/components/trace-waterfall', () => ({
  TraceWaterfall: () => <div data-testid="trace-waterfall" />,
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/shared/components/ui/agent-badge', () => ({
  AgentBadge: ({ agent }: { agent: string }) => <span data-testid="agent-badge">{agent}</span>,
}))

const makeSession = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  session_id: 'sess-abc-123-456-789',
  agent_type: 'claude',
  model: 'claude-opus-4-6',
  start_time: '2026-03-21T10:00:00Z',
  end_time: '2026-03-21T10:05:00Z',
  duration_ms: 300000,
  total_cost: 0.05,
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 200,
  cache_creation_tokens: 0,
  event_count: 5,
  prompt_count: 2,
  tool_call_count: 3,
  project_name: null,
  ...overrides,
})

const makeEvent = (overrides: Partial<SessionDetailEvent> = {}): SessionDetailEvent => ({
  event_name: 'api_request',
  timestamp: '2026-03-21T10:00:00Z',
  model: 'claude-opus-4-6',
  input_tokens: 100,
  output_tokens: 50,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  cost_usd: 0.01,
  duration_ms: 1000,
  tool_name: null,
  tool_success: null,
  prompt_id: 'prompt-1',
  body: null,
  ...overrides,
})

describe('SessionDetail', () => {
  it('에이전트 배지를 렌더링한다', () => {
    const session = makeSession()
    render(<SessionDetail session={session} events={[makeEvent()]} />)
    expect(screen.getByTestId('agent-badge')).toBeInTheDocument()
  })

  it('세션 ID 앞 16자를 표시한다', () => {
    const session = makeSession({ session_id: 'sess-abc-123-456-789' })
    render(<SessionDetail session={session} events={[makeEvent()]} />)
    expect(screen.getByText('sess-abc-123-456')).toBeInTheDocument()
  })

  it('List/Waterfall 탭이 존재한다', () => {
    const session = makeSession()
    render(<SessionDetail session={session} events={[makeEvent()]} />)
    expect(screen.getByRole('tab', { name: 'List' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Waterfall' })).toBeInTheDocument()
  })

  it('기본적으로 List 탭이 활성이다', () => {
    const session = makeSession()
    render(<SessionDetail session={session} events={[makeEvent()]} />)
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Waterfall 탭 클릭 시 waterfall 컴포넌트가 표시된다', () => {
    const session = makeSession()
    render(<SessionDetail session={session} events={[makeEvent()]} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Waterfall' }))
    expect(screen.getByTestId('trace-waterfall')).toBeInTheDocument()
  })

  it('이벤트가 없을 때 빈 상태를 표시한다', () => {
    const session = makeSession()
    render(<SessionDetail session={session} events={[]} />)
    expect(screen.getByText('sessions.detail.noEvents')).toBeInTheDocument()
  })

  it('프롬프트 그룹으로 이벤트를 그룹화한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ prompt_id: 'p1', event_name: 'api_request' }),
      makeEvent({ prompt_id: 'p2', event_name: 'tool_result', tool_name: 'bash', tool_success: 1 }),
    ]
    render(<SessionDetail session={session} events={events} />)
    // 2개 그룹 → promptNum + 1, promptNum + 2
    expect(screen.getByText('sessions.detail.promptNum1')).toBeInTheDocument()
    expect(screen.getByText('sessions.detail.promptNum2')).toBeInTheDocument()
  })

  it('user_prompt 이벤트에 body를 표시한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({
        event_name: 'user_prompt',
        body: 'Hello world',
        prompt_id: 'p1',
      }),
    ]
    render(<SessionDetail session={session} events={events} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('api_request 이벤트 레이블을 표시한다', () => {
    const session = makeSession()
    const events = [makeEvent({ event_name: 'api_request', model: 'claude-opus-4-6' })]
    render(<SessionDetail session={session} events={events} />)
    expect(screen.getByText(/API Request/)).toBeInTheDocument()
  })

  it('tool_result 이벤트 레이블을 표시한다', () => {
    const session = makeSession()
    const events = [makeEvent({ event_name: 'tool_result', tool_name: 'bash', tool_success: 1 })]
    render(<SessionDetail session={session} events={events} />)
    expect(screen.getByText(/Tool: bash/)).toBeInTheDocument()
  })

  it('실패한 tool_result에 [FAIL] 레이블을 추가한다', () => {
    const session = makeSession()
    const events = [makeEvent({ event_name: 'tool_result', tool_name: 'bash', tool_success: 0 })]
    render(<SessionDetail session={session} events={events} />)
    expect(screen.getByText(/\[FAIL\]/)).toBeInTheDocument()
  })
})
