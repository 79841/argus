import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UsageHeatmap } from '@/features/dashboard/components/usage-heatmap'
import type { DailyStats } from '@/shared/lib/queries'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-21T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const makeStats = (overrides: Partial<DailyStats> = {}): DailyStats => ({
  date: '2026-03-21',
  agent_type: 'claude',
  sessions: 5,
  cost: 0.1,
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 200,
  ...overrides,
})

describe('UsageHeatmap', () => {
  it('Usage Heatmap 제목을 렌더링한다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    expect(screen.getByText('사용량 히트맵')).toBeInTheDocument()
  })

  it('4개 모드 탭을 렌더링한다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    expect(screen.getByRole('tab', { name: '에이전트' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '세션' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '비용' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '캐시' })).toBeInTheDocument()
  })

  it('기본 모드는 에이전트이다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    const agentsTab = screen.getByRole('tab', { name: '에이전트' })
    expect(agentsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('세션 탭으로 전환할 수 있다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    fireEvent.click(screen.getByRole('tab', { name: '세션' }))
    expect(screen.getByRole('tab', { name: '세션' })).toHaveAttribute('aria-selected', 'true')
  })

  it('비용 탭으로 전환할 수 있다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    fireEvent.click(screen.getByRole('tab', { name: '비용' }))
    expect(screen.getByRole('tab', { name: '비용' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Agents 모드에서 에이전트 범례를 표시한다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('Gemini CLI')).toBeInTheDocument()
  })

  it('세션 모드에서 에이전트 범례를 숨긴다', () => {
    render(<UsageHeatmap data={[]} agentType="all" />)
    fireEvent.click(screen.getByRole('tab', { name: '세션' }))
    // Sessions 모드에서는 범례가 없음
    expect(screen.queryByText('Claude Code')).not.toBeInTheDocument()
  })

  it('데이터가 있을 때 격자를 렌더링한다', () => {
    const data = [makeStats()]
    const { container } = render(<UsageHeatmap data={data} agentType="all" />)
    // 날짜 셀들이 존재해야 함
    const cells = container.querySelectorAll('[title]')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('날짜 셀의 title에 날짜 정보가 포함된다', () => {
    const data = [makeStats({ date: '2026-03-21', sessions: 5 })]
    const { container } = render(<UsageHeatmap data={data} agentType="all" />)
    const cellWithSessions = Array.from(container.querySelectorAll('[title]')).find(
      (el) => el.getAttribute('title')?.includes('5 sessions')
    )
    expect(cellWithSessions).toBeTruthy()
  })

})
