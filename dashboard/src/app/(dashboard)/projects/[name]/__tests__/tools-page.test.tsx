import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ name: 'my-project' })),
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/features/tools', () => ({
  useToolsData: vi.fn(() => ({
    tools: [],
    topTools: [],
    daily: [],
    individual: [],
    registered: [],
    kpi: null,
    loading: false,
  })),
  TopToolsChart: () => <div data-testid="top-tools-chart" />,
  CategoryTreemap: () => <div data-testid="category-treemap" />,
  DailyTrendChart: () => <div data-testid="daily-trend-chart" />,
  FailRateTrendChart: () => <div data-testid="fail-rate-trend-chart" />,
  DetailsSection: () => <div data-testid="details-section" />,
}))

vi.mock('@/shared/components/ui/kpi-card', () => ({
  KpiCard: ({ label }: { label: string }) => <div data-testid="kpi-card">{label}</div>,
}))

vi.mock('@/shared/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('@/shared/components/agent-filter', () => ({
  AgentFilter: () => <div data-testid="agent-filter" />,
}))

vi.mock('@/shared/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}))

vi.mock('@/shared/lib/format', () => ({
  formatDuration: (ms: number) => `${ms}ms`,
}))

import ProjectToolsPage from '../tools/page'
import { useToolsData } from '@/features/tools'

describe('ProjectToolsPage', () => {
  it('에이전트 필터와 기간 버튼을 렌더링한다', () => {
    render(<ProjectToolsPage />)
    expect(screen.getByTestId('agent-filter')).toBeInTheDocument()
    expect(screen.getByText('tools.date.7')).toBeInTheDocument()
    expect(screen.getByText('tools.date.30')).toBeInTheDocument()
  })

  it('KPI 카드 4개를 렌더링한다', () => {
    render(<ProjectToolsPage />)
    const kpiCards = screen.getAllByTestId('kpi-card')
    expect(kpiCards).toHaveLength(4)
  })

  it('useToolsData를 프로젝트 이름과 함께 호출한다', () => {
    render(<ProjectToolsPage />)
    expect(useToolsData).toHaveBeenCalledWith('all', '7', 'my-project')
  })

  it('빈 데이터일 때 EmptyState를 렌더링한다', () => {
    render(<ProjectToolsPage />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})
