'use client'

import { useMemo } from 'react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { DataTable } from '@/shared/components/ui/data-table'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { AGENTS } from '@/shared/lib/agents'
import { AGENT_TYPES } from '@/shared/lib/constants'
import { AGENT_CHART_COLORS, CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import { useEfficiencyData } from '../hooks/use-efficiency-data'
import type { AgentType } from '@/shared/lib/agents'
import type { EfficiencyTabProps, EfficiencyAgentRow } from '@/features/usage/types/usage'

const DOT_CONFIG = { r: 3 } as const

export const EfficiencyTab = ({ agentType, project, dateRange }: EfficiencyTabProps) => {
  const { t } = useLocale()
  const { agentRows, trend, overall } = useEfficiencyData({ agentType, project, dateRange })

  const efficiencyColumns = useMemo(() => [
    {
      key: 'agent_type',
      label: t('usage.col.agent'),
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    { key: 'cache_rate', label: t('usage.col.cacheRate'), align: 'right' as const, format: (v: unknown) => `${Number(v).toFixed(1)}%` },
    { key: 'token_efficiency', label: t('usage.col.tokenEff'), align: 'right' as const, format: (v: unknown) => Number(v).toFixed(2) },
    { key: 'avg_duration_s', label: t('usage.col.avgSpeed'), align: 'right' as const, format: (v: unknown) => `${Number(v).toFixed(2)}s` },
    { key: 'score', label: t('usage.col.score'), align: 'right' as const, format: (v: unknown) => <span className="font-semibold">{String(v)}</span> },
  ], [t])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('usage.kpi.cacheHitRate')} value={overall ? `${overall.cacheRate.toFixed(1)}%` : '-'} sub={t('usage.kpi.cacheReadDesc')} />
        <KpiCard label={t('usage.kpi.avgResponseTime')} value={overall ? `${overall.avgDuration.toFixed(2)}s` : '-'} sub={t('usage.kpi.perApiRequest')} />
        <KpiCard label={t('usage.kpi.efficiencyScore')} value={overall ? `${overall.score}` : '-'} sub={t('usage.kpi.compositeScore')} />
      </div>

      <ChartCard title={t('usage.chart.efficiencyTrend')} height={180} empty={trend.length === 0}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} />
            <Legend {...CHART_THEME.legend} />
            {AGENT_TYPES.map(id => (
              <Line key={id} type="monotone" dataKey={id} stroke={AGENT_CHART_COLORS[id]} dot={DOT_CONFIG} connectNulls name={AGENTS[id].name} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t('usage.chart.efficiencyByAgent')}>
        <DataTable<EfficiencyAgentRow>
          columns={efficiencyColumns}
          data={agentRows}
          emptyMessage={t('usage.noEfficiencyData')}
        />
      </ChartCard>
    </div>
  )
}
