import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProjectPreviewSidebar } from '@/features/projects/components/project-preview-sidebar'

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/features/projects/hooks/use-project-detail', () => ({
  useProjectDetail: vi.fn(),
}))

vi.mock('@/features/projects/components/agent-dist-chart', () => ({
  AgentDistChart: () => <div data-testid="agent-dist-chart" />,
}))

vi.mock('@/features/projects/components/daily-cost-chart', () => ({
  DailyCostChart: () => <div data-testid="daily-cost-chart" />,
}))

vi.mock('@/shared/components/ui/chart-card', () => ({
  ChartCard: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
}))

import { useProjectDetail } from '@/features/projects/hooks/use-project-detail'
import type { ProjectDetailStats, ProjectDailyCost } from '@/shared/lib/queries'

const mockStats: ProjectDetailStats = {
  project_name: 'test-project',
  total_cost: 1.23,
  total_sessions: 42,
  total_requests: 150,
  total_input_tokens: 10000,
  total_output_tokens: 5000,
  total_cache_read_tokens: 3000,
  cache_hit_rate: 0.3,
  first_activity: '2026-01-01T00:00:00Z',
  last_activity: '2026-03-26T00:00:00Z',
  top_model: 'claude-opus-4-6',
  agent_breakdown: [
    { agent_type: 'claude', cost: 1.0, sessions: 30 },
    { agent_type: 'codex', cost: 0.23, sessions: 12 },
  ],
}

const mockDaily: ProjectDailyCost[] = [
  { date: '2026-03-25', project_name: 'test-project', cost: 0.5 },
  { date: '2026-03-26', project_name: 'test-project', cost: 0.73 },
]

describe('ProjectPreviewSidebar', () => {
  it('projectName이 null이면 placeholder를 표시한다', () => {
    render(<ProjectPreviewSidebar projectName={null} />)
    expect(screen.getByText('projects.preview.placeholder')).toBeInTheDocument()
  })

  it('null일 때 FolderOpen 아이콘이 렌더링된다', () => {
    const { container } = render(<ProjectPreviewSidebar projectName={null} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('projectName이 있을 때 프로젝트 이름을 표시한다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: null,
      loading: true,
      stats: undefined,
      daily: [],
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    expect(screen.getByText('test-project')).toBeInTheDocument()
  })

  it('로딩 중에는 KPI 값이 — 로 표시된다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: null,
      loading: true,
      stats: undefined,
      daily: [],
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  it('데이터 로드 완료 후 KPI 값을 표시한다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: { stats: mockStats, daily: mockDaily },
      loading: false,
      stats: mockStats,
      daily: mockDaily,
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    expect(screen.getByText('$1.23')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('30.0%')).toBeInTheDocument()
  })

  it('AgentDistChart를 렌더링한다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: { stats: mockStats, daily: mockDaily },
      loading: false,
      stats: mockStats,
      daily: mockDaily,
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    expect(screen.getByTestId('agent-dist-chart')).toBeInTheDocument()
  })

  it('DailyCostChart를 렌더링한다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: { stats: mockStats, daily: mockDaily },
      loading: false,
      stats: mockStats,
      daily: mockDaily,
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    expect(screen.getByTestId('daily-cost-chart')).toBeInTheDocument()
  })

  it('상세 보기 링크가 올바른 URL을 가진다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: { stats: mockStats, daily: mockDaily },
      loading: false,
      stats: mockStats,
      daily: mockDaily,
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="test-project" />)
    const link = screen.getByRole('link', { name: /common\.viewDetail/i })
    expect(link).toHaveAttribute('href', '/projects/test-project')
  })

  it('프로젝트 이름에 특수문자가 있을 때 URL 인코딩된 링크를 반환한다', () => {
    vi.mocked(useProjectDetail).mockReturnValue({
      data: { stats: { ...mockStats, project_name: 'my project/test' }, daily: mockDaily },
      loading: false,
      stats: { ...mockStats, project_name: 'my project/test' },
      daily: mockDaily,
      refetch: vi.fn(),
    })

    render(<ProjectPreviewSidebar projectName="my project/test" />)
    const link = screen.getByRole('link', { name: /common\.viewDetail/i })
    expect(link).toHaveAttribute('href', '/projects/my%20project%2Ftest')
  })
})
