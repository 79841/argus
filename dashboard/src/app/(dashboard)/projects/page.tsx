'use client'

import { useState } from 'react'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatCostDetail, formatDate } from '@/shared/lib/format'
import { FilterBar } from '@/shared/components/filter-bar'
import { DataTable } from '@/shared/components/ui/data-table'
import { useProjectsData, CostComparisonChart, ProjectPreviewSidebar } from '@/features/projects'
import type { ProjectComparisonRow } from '@/shared/lib/queries'
import { useIsMobile } from '@/shared/hooks/use-media-query'

export default function ProjectsPage() {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const { projects, loading, totalCost, mostActive } = useProjectsData()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

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

  const mainContent = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <ChartCard
        title={t('projects.chart.costComparison')}
        height={320}
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage={t('projects.chart.noData')}
      >
        <CostComparisonChart data={chartData} />
      </ChartCard>

      <ChartCard
        title={t('projects.table.title')}
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage={t('projects.chart.noData')}
      >
        <DataTable<ProjectComparisonRow>
          columns={columns}
          data={projects}
          onRowClick={(row) => setSelectedProject(row.project_name)}
        />
      </ChartCard>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">{t('projects.title')}</span></FilterBar>
      {selectedProject && !isMobile ? (
        <div className="flex flex-1 min-h-0">
          <div className="w-[65%] overflow-y-auto px-4 py-4">
            {mainContent}
          </div>
          <div className="flex-1 overflow-y-auto">
            <ProjectPreviewSidebar projectName={selectedProject} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {mainContent}
        </div>
      )}

      {isMobile && selectedProject && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl bg-background shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 shadow-sm">
              <button
                onClick={() => setSelectedProject(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('projects.backToList')}
              </button>
            </div>
            <ProjectPreviewSidebar projectName={selectedProject} />
          </div>
        </>
      )}
    </div>
  )
}
