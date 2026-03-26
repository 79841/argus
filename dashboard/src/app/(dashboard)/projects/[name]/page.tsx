'use client'

import { useParams } from 'next/navigation'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { DataTable } from '@/shared/components/ui/data-table'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { useLocale } from '@/shared/lib/i18n'
import type { AgentType } from '@/shared/lib/agents'
import { formatCost, formatCostDetail, formatTokens, formatDate, formatPercent } from '@/shared/lib/format'
import { useProjectDetail, AgentDistChart, DailyCostChart } from '@/features/projects'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)
  const { t } = useLocale()

  const { loading, stats, daily } = useProjectDetail(projectName)

  const pieData = (stats?.agent_breakdown ?? []).map((b) => ({
    name: b.agent_type,
    value: b.cost,
  }))

  const areaData = daily.map((d) => ({
    date: d.date,
    label: formatDate(d.date),
    cost: d.cost,
  }))

  const recentSessionsColumns = [
    {
      key: 'agent_type',
      label: t('insights.col.agent'),
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    {
      key: 'cost',
      label: t('projects.detail.kpi.totalCost'),
      align: 'right' as const,
      format: (v: unknown) => formatCostDetail(Number(v)),
    },
    {
      key: 'sessions',
      label: t('projects.detail.kpi.sessions'),
      align: 'right' as const,
      format: (v: unknown) => Number(v).toLocaleString(),
    },
  ]

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-4">
      {/* KPI 카드 6개 */}
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
        <KpiCard
          label={t('projects.detail.kpi.totalCost')}
          value={loading ? '—' : formatCost(stats?.total_cost ?? 0)}
          loading={loading}
        />
        <KpiCard
          label={t('projects.detail.kpi.sessions')}
          value={loading ? '—' : (stats?.total_sessions ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label={t('projects.detail.kpi.requests')}
          value={loading ? '—' : (stats?.total_requests ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label={t('projects.detail.kpi.inputTokens')}
          value={loading ? '—' : formatTokens(stats?.total_input_tokens ?? 0)}
          loading={loading}
        />
        <KpiCard
          label={t('projects.detail.kpi.outputTokens')}
          value={loading ? '—' : formatTokens(stats?.total_output_tokens ?? 0)}
          loading={loading}
        />
        <KpiCard
          label={t('projects.detail.kpi.cacheHitRate')}
          value={loading ? '—' : formatPercent(stats?.cache_hit_rate ?? 0)}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 에이전트별 비용 분포 PieChart */}
        <ChartCard
          title={t('projects.detail.chart.agentDist')}
          height={260}
          loading={loading}
          empty={!loading && pieData.length === 0}
          emptyMessage={t('projects.detail.noData')}
        >
          <AgentDistChart data={pieData} />
        </ChartCard>

        {/* 일별 비용 추이 AreaChart */}
        <ChartCard
          title={t('projects.detail.chart.dailyCost')}
          height={260}
          loading={loading}
          empty={!loading && areaData.length === 0}
          emptyMessage={t('projects.detail.noData')}
        >
          <DailyCostChart data={areaData} />
        </ChartCard>
      </div>

      {/* 에이전트별 상세 테이블 */}
      <ChartCard
        title={t('projects.detail.chart.agentStatus')}
        loading={loading}
        empty={!loading && (stats?.agent_breakdown ?? []).length === 0}
        emptyMessage={t('projects.detail.noData')}
      >
        <DataTable
          columns={recentSessionsColumns}
          data={(stats?.agent_breakdown ?? []) as unknown as Record<string, unknown>[]}
        />
      </ChartCard>
      </div>
    </div>
  )
}
