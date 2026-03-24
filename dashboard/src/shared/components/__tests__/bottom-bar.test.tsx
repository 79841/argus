import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BottomBar } from '@/shared/components/bottom-bar'

vi.mock('@/shared/lib/data-client', () => ({
  dataClient: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('@/shared/lib/format', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    formatCost: (v: number) => `$${v.toFixed(4)}`,
  }
})

vi.mock('@/shared/components/ui/agent-dot', () => ({
  AgentDot: ({ agent }: { agent: string; size?: string; pulse?: boolean }) => (
    <span data-testid="agent-dot" data-agent={agent} />
  ),
}))

import { dataClient } from '@/shared/lib/data-client'
const mockQuery = vi.mocked(dataClient.query)

describe('BottomBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.mockImplementation((name: string) => {
      if (name === 'ingest-status') return Promise.resolve({ agents: [] })
      if (name === 'overview') return Promise.resolve({ all_time_cost: 0, all_time_tokens: 0 })
      if (name === 'sessions/active') return Promise.resolve({ sessions: [] })
      return Promise.resolve({})
    })
  })

  it('3개 에이전트 레이블(Claude Code, Codex, Gemini CLI)을 렌더링한다', async () => {
    render(<BottomBar />)
    await waitFor(() => {
      expect(screen.getByText('Claude Code')).toBeInTheDocument()
      expect(screen.getByText('Codex')).toBeInTheDocument()
      expect(screen.getByText('Gemini CLI')).toBeInTheDocument()
    })
  })

  it('에이전트 상태 데이터가 없으면 "데이터 없음"을 표시한다', async () => {
    render(<BottomBar />)
    await waitFor(() => {
      const noDataElements = screen.getAllByText(/데이터 없음/)
      expect(noDataElements.length).toBe(3)
    })
  })

  it('Total 비용을 표시한다', async () => {
    mockQuery.mockImplementation((name: string) => {
      if (name === 'overview') return Promise.resolve({ all_time_cost: 1.5, all_time_tokens: 10000 })
      if (name === 'ingest-status') return Promise.resolve({ agents: [] })
      if (name === 'sessions/active') return Promise.resolve({ sessions: [] })
      return Promise.resolve({})
    })

    render(<BottomBar />)
    await waitFor(() => {
      expect(screen.getByText(/Total:/)).toBeInTheDocument()
    })
  })

  it('활성 세션이 있으면 에이전트 dot을 표시한다', async () => {
    mockQuery.mockImplementation((name: string) => {
      if (name === 'sessions/active') return Promise.resolve({
        sessions: [{
          session_id: 'sess-1',
          agent_type: 'claude',
          model: 'claude-opus-4-6',
          last_event: '2026-03-21T10:00:00Z',
          cost: 0.01,
          event_count: 5,
        }],
      })
      if (name === 'ingest-status') return Promise.resolve({ agents: [] })
      if (name === 'overview') return Promise.resolve({ all_time_cost: 0, all_time_tokens: 0 })
      return Promise.resolve({})
    })

    render(<BottomBar />)
    await waitFor(() => {
      expect(screen.getByTestId('agent-dot')).toBeInTheDocument()
    })
  })

  it('최근 수신 데이터가 있으면 상대 시간을 표시한다', async () => {
    // Use real timers to avoid fake timer conflicts with waitFor
    const originalDateNow = Date.now
    const fakeNow = new Date('2026-03-21T12:00:00Z').getTime()
    Date.now = () => fakeNow

    mockQuery.mockImplementation((name: string) => {
      if (name === 'ingest-status') return Promise.resolve({
        agents: [{
          agent_type: 'claude',
          last_received: '2026-03-21T11:30:00Z',
          today_count: 5,
          total_count: 100,
        }],
      })
      if (name === 'overview') return Promise.resolve({ all_time_cost: 0, all_time_tokens: 0 })
      if (name === 'sessions/active') return Promise.resolve({ sessions: [] })
      return Promise.resolve({})
    })

    render(<BottomBar />)
    await waitFor(() => {
      expect(screen.getByText('30m ago')).toBeInTheDocument()
    })

    Date.now = originalDateNow
  })
})
