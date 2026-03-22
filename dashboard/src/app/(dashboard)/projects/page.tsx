'use client'

import { useRouter } from 'next/navigation'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatCostDetail } from '@/shared/lib/format'
import { FilterBar } from '@/shared/components/filter-bar'
import { DataTable } from '@/shared/components/ui/data-table'
import { useProjectsData, CostComparisonChart } from '@/features/projects'

const formatDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function ProjectsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { projects, loading, totalCost, mostActive } = useProjectsData()

  const columns = [
    {
      key: 'project_name',
      label: t('projects.col.project'),
      format: (v: unknown) => (
        <span className="font-medium">{String(v)}</span>
      ),
    },
    {
      key: 'session_count',
      label: t('projects.col.sessions'),
      align: 'right' as const,
      format: (v: unknown) => Number(v).toLocaleString(),
    },
    {
      key: 'request_count',
      label: t('projects.col.requests'),
      align: 'right' as const,
      format: (v: unknown) => Number(v).toLocaleString(),
    },
    {
      key: 'total_cost',
      label: t('projects.col.cost'),
      align: 'right' as const,
      format: (v: unknown) => (
        <span className="font-semibold tabular-nums">{formatCostDetail(Number(v))}</span>
      ),
    },
    {
      key: 'top_model',
      label: t('projects.col.topModel'),
      format: (v: unknown) => (
        <span className="font-mono text-xs text-muted-foreground">
          {String(v || '—').replace(/^claude-/, '').replace(/^models\//, '').replace(/-\d{8}$/, '')}
        </span>
      ),
    },
    {
      key: 'last_activity',
      label: t('projects.col.lastActive'),
      align: 'right' as const,
      format: (v: unknown) => formatDate(String(v)),
    },
  ]

  const chartData = projects.slice(0, 15).map((p) => ({
    name: p.project_name.length > 20 ? p.project_name.slice(0, 18) + '…' : p.project_name,
    fullName: p.project_name,
    cost: p.total_cost,
  }))

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">{t('projects.title')}</span></FilterBar>
      <div className="flex-1 overflow-auto px-4 py-4">
      <div className="flex flex-col gap-4">
      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label={t('projects.kpi.totalProjects')}
          value={loading ? '—' : projects.length.toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label={t('projects.kpi.totalCost')}
          value={loading ? '—' : formatCost(totalCost)}
          loading={loading}
        />
        <KpiCard
          label={t('projects.kpi.mostActive')}
          value={loading ? '—' : (mostActive?.project_name ?? '—')}
          sub={mostActive ? `${mostActive.session_count.toLocaleString()} ${t('projects.sessions')}` : undefined}
          loading={loading}
        />
      </div>

      {/* 프로젝트별 비용 비교 바 차트 */}
      <ChartCard
        title={t('projects.chart.costComparison')}
        height={320}
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage={t('projects.chart.noData')}
      >
        <CostComparisonChart data={chartData} />
      </ChartCard>

      {/* 프로젝트 목록 테이블 */}
      <ChartCard
        title={t('projects.table.title')}
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage={t('projects.chart.noData')}
      >
        <DataTable
          columns={columns}
          data={projects as unknown as Record<string, unknown>[]}
          onRowClick={(row) => {
            router.push(`/projects/${encodeURIComponent(row.project_name as string)}`)
          }}
        />
      </ChartCard>
      </div>
      </div>
    </div>
  )
}
