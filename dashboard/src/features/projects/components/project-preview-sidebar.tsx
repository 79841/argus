'use client'

import Link from 'next/link'
import { FolderOpen, ArrowRight } from 'lucide-react'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatDateLong } from '@/shared/lib/format'
import { useProjectDetail } from '../hooks/use-project-detail'
import { AgentDistChart } from './agent-dist-chart'
import { DailyCostChart } from './daily-cost-chart'

type ProjectPreviewSidebarProps = {
  projectName: string | null
}

type KpiMiniItemProps = {
  label: string
  value: string
}

const KpiMiniItem = ({ label, value }: KpiMiniItemProps) => (
  <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-3 py-2">
    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="text-base font-bold tabular-nums">{value}</span>
  </div>
)

type SidebarContentProps = {
  projectName: string
}

const SidebarContent = ({ projectName }: SidebarContentProps) => {
  const { t } = useLocale()
  const { loading, stats, daily } = useProjectDetail(projectName)

  const cacheHitPct = stats ? `${(stats.cache_hit_rate * 100).toFixed(1)}%` : '—'
  const activityPeriod =
    stats?.first_activity && stats?.last_activity
      ? `${formatDateLong(stats.first_activity)} — ${formatDateLong(stats.last_activity)}`
      : '—'

  const pieData = (stats?.agent_breakdown ?? []).map((b) => ({
    name: b.agent_type,
    value: b.cost,
  }))

  const areaData = daily.map((d) => ({
    date: d.date,
    label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    cost: d.cost,
  }))

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <span className="text-lg font-semibold leading-tight">{projectName}</span>
        <span className="text-xs text-muted-foreground">
          {t('projects.preview.period')}: {loading ? '…' : activityPeriod}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KpiMiniItem
          label={t('projects.detail.kpi.totalCost')}
          value={loading ? '—' : formatCost(stats?.total_cost ?? 0)}
        />
        <KpiMiniItem
          label={t('projects.detail.kpi.sessions')}
          value={loading ? '—' : (stats?.total_sessions ?? 0).toLocaleString()}
        />
        <KpiMiniItem
          label={t('projects.detail.kpi.requests')}
          value={loading ? '—' : (stats?.total_requests ?? 0).toLocaleString()}
        />
        <KpiMiniItem
          label={t('projects.detail.kpi.cacheHitRate')}
          value={loading ? '—' : cacheHitPct}
        />
      </div>

      <ChartCard
        title={t('projects.detail.chart.agentDist')}
        height={200}
        loading={loading}
        empty={!loading && pieData.length === 0}
        emptyMessage={t('projects.detail.noData')}
      >
        <AgentDistChart data={pieData} />
      </ChartCard>

      <ChartCard
        title={t('projects.detail.chart.dailyCost')}
        height={180}
        loading={loading}
        empty={!loading && areaData.length === 0}
        emptyMessage={t('projects.detail.noData')}
      >
        <DailyCostChart data={areaData} />
      </ChartCard>

      <Link
        href={`/projects/${encodeURIComponent(projectName)}`}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        {t('common.viewDetail')}
        <ArrowRight className="size-4" />
      </Link>
    </>
  )
}

export const ProjectPreviewSidebar = ({ projectName }: ProjectPreviewSidebarProps) => {
  const { t } = useLocale()

  if (!projectName) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FolderOpen className="size-12 opacity-30" />
        <span className="text-sm">{t('projects.preview.placeholder')}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
      <SidebarContent projectName={projectName} />
    </div>
  )
}
