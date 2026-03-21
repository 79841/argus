import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IndividualToolTable } from '@/components/individual-tool-table'
import type { IndividualToolRow } from '@/lib/queries'

// Tooltip 등 Radix UI mock
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const makeRow = (overrides: Partial<IndividualToolRow> = {}): IndividualToolRow => ({
  tool_name: 'Agent',
  detail_type: 'agent',
  detail_name: 'plan-writer',
  agent_type: 'claude',
  invocation_count: 5,
  success_count: 5,
  fail_count: 0,
  last_used: '2026-03-21T10:00:00Z',
  ...overrides,
})

describe('IndividualToolTable', () => {
  it('빈 데이터에서 "아직 데이터가 없습니다" 메시지를 표시한다', () => {
    render(<IndividualToolTable data={[]} />)
    expect(screen.getByText('아직 데이터가 없습니다')).toBeInTheDocument()
  })

  it('빈 데이터에서 설정 가이드를 표시한다', () => {
    render(<IndividualToolTable data={[]} />)
    expect(screen.getByText(/OTEL_LOG_TOOL_DETAILS/)).toBeInTheDocument()
  })

  it('데이터가 있으면 "Orchestration Tools" 카드를 렌더링한다', () => {
    const data = [makeRow()]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('Orchestration Tools')).toBeInTheDocument()
  })

  it('Agent 그룹 헤더를 표시한다', () => {
    const data = [makeRow({ tool_name: 'Agent', detail_type: 'agent', detail_name: 'plan-writer' })]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })

  it('Skill 그룹 헤더를 표시한다', () => {
    const data = [makeRow({ tool_name: 'Skill', detail_type: 'skill', detail_name: 'commit' })]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('Skills')).toBeInTheDocument()
  })

  it('MCP 그룹 헤더를 표시한다', () => {
    const data = [makeRow({ tool_name: 'mcp:linear', detail_type: 'mcp', detail_name: 'mcp__linear__get_issue' })]
    render(<IndividualToolTable data={data} />)
    // "MCP" appears in both the group header and Badge
    expect(screen.getAllByText('MCP').length).toBeGreaterThan(0)
  })

  it('mcp 이름을 파싱하여 슬래시 형식으로 표시한다', () => {
    const data = [makeRow({
      tool_name: 'mcp:linear',
      detail_type: 'mcp',
      detail_name: 'mcp__linear__get_issue',
    })]
    render(<IndividualToolTable data={data} />)
    // "get_issue" appears in TooltipTrigger and TooltipContent (both mocked)
    expect(screen.getAllByText('get_issue').length).toBeGreaterThan(0)
  })

  it('에이전트 타입에 따른 색상 레이블을 표시한다', () => {
    const data = [makeRow({ agent_type: 'claude' })]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('호출 횟수를 표시한다', () => {
    const data = [makeRow({ invocation_count: 42 })]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('실패 건수가 0이면 0을 표시한다', () => {
    const data = [makeRow({ fail_count: 0 })]
    render(<IndividualToolTable data={data} />)
    // fail_count 0은 muted로 표시
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('여러 그룹을 함께 렌더링한다', () => {
    const data = [
      makeRow({ tool_name: 'Agent', detail_type: 'agent', detail_name: 'writer' }),
      makeRow({ tool_name: 'Skill', detail_type: 'skill', detail_name: 'commit' }),
    ]
    render(<IndividualToolTable data={data} />)
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
  })
})
