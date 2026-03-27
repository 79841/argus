'use client'

import { useLocale } from '@/shared/lib/i18n'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { DataTable } from '@/shared/components/ui/data-table'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { formatCostDetail, formatCostChart, formatDuration, shortenModel } from '@/shared/lib/format'
import type { ModelCostEfficiency } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'

type ModelEfficiencyTableProps = {
  data: ModelCostEfficiency[]
  loading: boolean
}

export const ModelEfficiencyTable = ({ data, loading }: ModelEfficiencyTableProps) => {
  const { t } = useLocale()

  const modelColumns = [
    {
      key: 'model',
      label: t('insights.col.model'),
      format: (v: unknown) => <span className="font-mono text-xs">{shortenModel(String(v))}</span>,
    },
    {
      key: 'agent_type',
      label: t('insights.col.agent'),
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    { key: 'request_count', label: t('insights.col.reqs'), align: 'right' as const, format: (v: unknown) => Number(v).toLocaleString() },
    { key: 'total_cost', label: t('insights.col.totalCost'), align: 'right' as const, format: (v: unknown) => formatCostDetail(Number(v)) },
    { key: 'avg_cost_per_request', label: t('insights.col.avgPerReq'), align: 'right' as const, format: (v: unknown) => formatCostDetail(Number(v)) },
    { key: 'cost_per_1k_tokens', label: t('insights.col.per1kTok'), align: 'right' as const, format: (v: unknown) => formatCostChart(Number(v)) },
    { key: 'avg_duration_ms', label: t('insights.col.avgSpeed'), align: 'right' as const, format: (v: unknown) => formatDuration(Number(v)) },
  ]

  return (
    <ChartCard title={t('insights.modelEfficiency')}>
      {loading ? (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
          {t('insights.loading')}
        </div>
      ) : !data.length ? (
        <EmptyState title={t('insights.noModelData')} />
      ) : (
        <DataTable<ModelCostEfficiency>
          columns={modelColumns}
          data={data}
        />
      )}
    </ChartCard>
  )
}
