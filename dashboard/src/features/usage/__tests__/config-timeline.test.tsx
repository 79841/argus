import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfigTimeline } from '@/features/usage/components/config-timeline'
import type { ConfigChange } from '@/shared/lib/config-tracker'

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/shared/lib/data-client', () => ({
  dataClient: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('@/shared/lib/format', () => ({
  formatCostChart: (v: number) => `$${v.toFixed(4)}`,
}))

import { dataClient } from '@/shared/lib/data-client'
const mockQuery = vi.mocked(dataClient.query)

const makeChange = (overrides: Partial<ConfigChange> = {}): ConfigChange => ({
  commit_hash: 'abc1234567890',
  commit_message: 'chore: update settings',
  date: '2026-03-21T10:00:00Z',
  file_path: '~/.claude/settings.json',
  agent_type: 'claude',
  diff: '+  "key": "value"\n-  "key": "old"',
  ...overrides,
})

describe('ConfigTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('빈 데이터에서 "No config change history" 메시지를 표시한다', () => {
    render(<ConfigTimeline data={[]} />)
    expect(screen.getByText('config.timeline.empty')).toBeInTheDocument()
  })

  it('변경 항목의 파일 경로를 표시한다', () => {
    const data = [makeChange()]
    render(<ConfigTimeline data={data} />)
    expect(screen.getAllByText('~/.claude/settings.json').length).toBeGreaterThan(0)
  })

  it('커밋 메시지를 표시한다', () => {
    const data = [makeChange()]
    render(<ConfigTimeline data={data} />)
    expect(screen.getByText('chore: update settings')).toBeInTheDocument()
  })

  it('커밋 해시 앞 7자를 표시한다', () => {
    const data = [makeChange({ commit_hash: 'abc1234567890' })]
    render(<ConfigTimeline data={data} />)
    expect(screen.getByText('abc1234')).toBeInTheDocument()
  })

  it('초기에는 "Select an item" 안내를 표시한다', () => {
    const data = [makeChange()]
    render(<ConfigTimeline data={data} />)
    expect(screen.getByText('config.timeline.selectItem')).toBeInTheDocument()
  })

  it('항목 클릭 시 diff를 오른쪽 패널에 표시한다', () => {
    mockQuery.mockResolvedValue(null)
    const data = [makeChange({ diff: '+  "key": "value"\n-  "key": "old"' })]
    const { container } = render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)

    // diff lines may be split across elements, use container textContent
    expect(container.textContent).toContain('+  "key": "value"')
  })

  it('같은 항목 다시 클릭 시 선택을 해제한다', () => {
    mockQuery.mockResolvedValue(null)
    const data = [makeChange()]
    render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(screen.getByText('config.timeline.selectItem')).toBeInTheDocument()
  })

  it('항목 클릭 시 ComparePanel을 로드한다', async () => {
    mockQuery.mockResolvedValue({
      before: { avg_cost: 0.01, cache_rate: 0.3, tool_fail_rate: 0.05, request_count: 10 },
      after: { avg_cost: 0.008, cache_rate: 0.4, tool_fail_rate: 0.03, request_count: 12 },
    })

    const data = [makeChange()]
    render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('config.timeline.beforeAfter')).toBeInTheDocument()
    })
  })

  it('diff가 없는 경우 "No diff data available"을 표시한다', () => {
    const data = [makeChange({ diff: '' })]
    render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)

    expect(screen.getByText('config.timeline.noDiff')).toBeInTheDocument()
  })

  it('diff에서 추가된 줄(+)을 녹색으로 렌더링한다', () => {
    mockQuery.mockResolvedValue(null)
    const data = [makeChange({ diff: '+ added line' })]
    render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)

    const addedLine = screen.getByText('+ added line')
    expect(addedLine).toHaveClass('text-green-800')
  })

  it('diff에서 삭제된 줄(-)을 빨간색으로 렌더링한다', () => {
    mockQuery.mockResolvedValue(null)
    const data = [makeChange({ diff: '- removed line' })]
    render(<ConfigTimeline data={data} />)

    const button = screen.getByRole('button', { name: /chore: update settings/ })
    fireEvent.click(button)

    const removedLine = screen.getByText('- removed line')
    expect(removedLine).toHaveClass('text-red-800')
  })
})
