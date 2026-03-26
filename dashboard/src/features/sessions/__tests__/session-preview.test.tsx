import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SessionPreview } from '@/features/sessions/components/session-preview'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'

vi.mock('@/features/sessions/components/session-model-cost-chart', () => ({
  SessionModelCostChart: () => <div data-testid="model-cost-chart" />,
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
  session_id: 'sess-abc-123-456-789-xyz',
  agent_type: 'claude',
  model: 'claude-opus-4-6',
  started_at: '2026-03-21T10:00:00Z',
  last_activity: '2026-03-21T10:05:00Z',
  duration_ms: 300000,
  cost: 0.05,
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 200,
  request_count: 5,
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

describe('SessionPreview', () => {
  it('에이전트 배지를 렌더링한다', () => {
    const session = makeSession()
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    expect(screen.getByTestId('agent-badge')).toHaveTextContent('claude')
  })

  it('세션 ID 앞 16자를 표시한다', () => {
    const session = makeSession({ session_id: 'sess-abc-123-456-789-xyz' })
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    expect(screen.getByText('sess-abc-123-456')).toBeInTheDocument()
  })

  it('프로젝트명을 표시한다', () => {
    const session = makeSession({ project_name: 'my-project' })
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    expect(screen.getByText('my-project')).toBeInTheDocument()
  })

  it('KPI 비용 값을 표시한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', cost_usd: 0.05 }),
      makeEvent({ event_name: 'api_request', cost_usd: 0.03 }),
    ]
    render(<SessionPreview session={session} events={events} />)
    expect(screen.getByText('$0.08')).toBeInTheDocument()
  })

  it('KPI 입력 토큰을 표시한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 2000, cache_read_tokens: 0 }),
    ]
    render(<SessionPreview session={session} events={events} />)
    expect(screen.getByText('2.0K')).toBeInTheDocument()
  })

  it('캐시 토큰이 있으면 퍼센트를 함께 표시한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request', input_tokens: 100, cache_read_tokens: 100 }),
    ]
    render(<SessionPreview session={session} events={events} />)
    expect(screen.getByText('(50%)')).toBeInTheDocument()
  })

  it('모델 비용 차트 컴포넌트가 렌더링된다', () => {
    const session = makeSession()
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    expect(screen.getByTestId('model-cost-chart')).toBeInTheDocument()
  })

  it('상세 보기 링크가 올바른 URL을 가리킨다', () => {
    const session = makeSession({ session_id: 'sess-abc-123' })
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/sessions/sess-abc-123')
  })

  it('세션 ID에 특수문자가 있으면 URL 인코딩한다', () => {
    const session = makeSession({ session_id: 'sess/special&id' })
    render(<SessionPreview session={session} events={[makeEvent()]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/sessions/${encodeURIComponent('sess/special&id')}`)
  })

  it('loading 상태에서 스켈레톤을 렌더링한다', () => {
    const session = makeSession()
    const { container } = render(<SessionPreview session={session} events={[]} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('loading 상태에서는 KPI 그리드를 렌더링하지 않는다', () => {
    const session = makeSession()
    render(<SessionPreview session={session} events={[makeEvent()]} loading={true} />)
    expect(screen.queryByTestId('agent-badge')).not.toBeInTheDocument()
  })

  it('loading=false면 정상 콘텐츠를 렌더링한다', () => {
    const session = makeSession()
    render(<SessionPreview session={session} events={[makeEvent()]} loading={false} />)
    expect(screen.getByTestId('agent-badge')).toBeInTheDocument()
  })

  it('요청/도구 수를 표시한다', () => {
    const session = makeSession()
    const events = [
      makeEvent({ event_name: 'api_request' }),
      makeEvent({ event_name: 'api_request' }),
      makeEvent({ event_name: 'tool_result' }),
    ]
    render(<SessionPreview session={session} events={events} />)
    expect(screen.getByText('2 / 1')).toBeInTheDocument()
  })
})
