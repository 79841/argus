'use client'

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { DataTable } from '@/shared/components/ui/data-table'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { CHART_THEME, SERIES_COLORS } from '@/shared/lib/chart-theme'
import { formatCostChart } from '@/shared/lib/format'
import { useModelsData } from '../hooks/use-models-data'
import type { AgentType } from '@/shared/lib/agents'
import type { ModelsTabProps } from '@/features/usage/types/usage'

const modelColumns = [
  { key: 'model', label: 'Model', format: (v: unknown) => <span className="font-mono text-xs">{String(v)}</span> },
  {
    key: 'agent_type',
    label: 'Agent',
    format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
  },
  { key: 'request_count', label: 'Reqs', align: 'right' as const, format: (v: unknown) => Number(v).toLocaleString() },
  { key: 'cost', label: 'Cost', align: 'right' as const, format: (v: unknown) => formatCostChart(Number(v)) },
  { key: 'avg_cost', label: 'Avg/req', align: 'right' as const, format: (v: unknown) => formatCostChart(Number(v)) },
]

export const ModelsTab = ({ agentType, project, dateRange }: ModelsTabProps) => {
  const { models } = useModelsData({ agentType, project, dateRange })

  const totalCost = models.reduce((s, m) => s + m.cost, 0)
  const pieData = models.slice(0, 8).map((m, i) => ({
    name: m.model,
    value: m.cost,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }))

  return (
    <div className="space-y-4">
      <ChartCard title="Model Usage">
        <DataTable
          columns={modelColumns}
          data={models as unknown as Record<string, unknown>[]}
          emptyMessage="No model data"
        />
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Cost by Model" height={200} empty={pieData.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  (percent ?? 0) > 0.05 ? `${(name ?? '').slice(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests by Model" height={200} empty={models.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={models.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 9, fill: CHART_THEME.axis.fill }} tickLine={false} width={90} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [Number(v).toLocaleString(), 'Requests']} />
              <Bar dataKey="request_count" name="Requests" radius={[0, 4, 4, 0]}>
                {models.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {totalCost > 0 && (
        <div className="text-xs text-muted-foreground text-right px-1">
          Total: {formatCostChart(totalCost)} across {models.length} model{models.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
