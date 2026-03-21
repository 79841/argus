import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToolDetailTable } from '@/features/tools/components/tool-detail-table'
import type { ToolDetailRow } from '@/shared/lib/queries'

vi.mock('@/shared/lib/format', () => ({
  formatTokens: (v: number) => `${v}tok`,
  formatDuration: (v: number) => `${v}ms`,
}))

const makeRow = (overrides: Partial<ToolDetailRow> = {}): ToolDetailRow => ({
  tool_name: 'test_tool',
  category: 'Built-in',
  invocation_count: 10,
  success_count: 9,
  fail_count: 1,
  avg_duration_ms: 100,
  total_duration_ms: 1000,
  prompt_count: 5,
  total_tokens: 500,
  total_cost: 0.01,
  ...overrides,
})

describe('ToolDetailTable', () => {
  it('빈 데이터에서는 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<ToolDetailTable data={[]} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('Built-in 카테고리 카드를 렌더링한다', () => {
    const data = [makeRow({ tool_name: 'read_file', category: 'Built-in' })]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('Built-in')).toBeInTheDocument()
  })

  it('Orchestration 카테고리 카드를 렌더링한다', () => {
    const data = [makeRow({ tool_name: 'agent_call', category: 'Orchestration' })]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('Orchestration')).toBeInTheDocument()
  })

  it('도구 이름을 테이블에 표시한다', () => {
    const data = [makeRow({ tool_name: 'bash', category: 'Built-in' })]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('bash')).toBeInTheDocument()
  })

  it('mcp__ 접두사를 파싱하여 표시한다', () => {
    const data = [makeRow({ tool_name: 'mcp__linear__get_issue', category: 'Built-in' })]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('linear/get_issue')).toBeInTheDocument()
  })

  it('실패율 20% 이상이면 행을 빨간색으로 강조한다', () => {
    const data = [makeRow({
      tool_name: 'bad_tool',
      category: 'Built-in',
      invocation_count: 10,
      fail_count: 3,
      success_count: 7,
    })]
    render(<ToolDetailTable data={data} />)
    // 실패율 30% → 높음 → ! 표시
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('실패율 0%이면 경고 표시가 없다', () => {
    const data = [makeRow({
      tool_name: 'good_tool',
      category: 'Built-in',
      invocation_count: 10,
      fail_count: 0,
      success_count: 10,
    })]
    render(<ToolDetailTable data={data} />)
    expect(screen.queryByText('!')).not.toBeInTheDocument()
  })

  it('호출 횟수, 성공/실패 수를 표시한다', () => {
    const data = [makeRow({
      category: 'Built-in',
      invocation_count: 15,
      success_count: 13,
      fail_count: 2,
    })]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('여러 카테고리를 각각 카드로 렌더링한다', () => {
    const data = [
      makeRow({ tool_name: 'bash', category: 'Built-in' }),
      makeRow({ tool_name: 'agent', category: 'Orchestration' }),
    ]
    render(<ToolDetailTable data={data} />)
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.getByText('Orchestration')).toBeInTheDocument()
  })

  it('비용 비율을 퍼센트로 표시한다', () => {
    const data = [makeRow({ category: 'Built-in', total_cost: 0.01 })]
    render(<ToolDetailTable data={data} />)
    // 하나의 아이템이므로 100%
    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })
})
