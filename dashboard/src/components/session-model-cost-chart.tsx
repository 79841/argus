'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { CHART_THEME } from '@/lib/chart-theme'
import { computeModelCostBreakdown } from '@/lib/session-model-cost'
import type { SessionDetailEvent } from '@/lib/queries'

const MODEL_PIE_COLORS = [
  'oklch(0.55 0 0)',
  'oklch(0.65 0 0)',
  'oklch(0.45 0 0)',
  'oklch(0.75 0 0)',
  'oklch(0.35 0 0)',
]

const shortenModel = (model: string): string => {
  return model
    .replace(/^claude-/, '')
    .replace(/^models\//, '')
    .replace(/-\d{8}$/, '')
}

const formatCost = (value: number): string => `$${value.toFixed(4)}`

type SessionModelCostChartProps = {
  events: SessionDetailEvent[]
}

export const SessionModelCostChart = ({ events }: SessionModelCostChartProps) => {
  const breakdown = computeModelCostBreakdown(events)

  if (breakdown.length === 0) return null

  if (breakdown.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <span className="text-xs text-muted-foreground">Single model:</span>
        <Badge variant="secondary" className="text-xs font-mono">
          {shortenModel(breakdown[0].model)}
        </Badge>
        <span className="ml-auto text-xs font-medium tabular-nums">
          {formatCost(breakdown[0].cost)}
        </span>
      </div>
    )
  }

  const pieData = breakdown.map((item, i) => ({
    name: item.model,
    value: item.cost,
    color: MODEL_PIE_COLORS[i % MODEL_PIE_COLORS.length],
  }))

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Model Cost Breakdown</h3>
      <div className="flex gap-4">
        {/* Donut Chart */}
        <div className="shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_THEME.tooltip.containerStyle}
                labelStyle={CHART_THEME.tooltip.labelStyle}
                itemStyle={CHART_THEME.tooltip.itemStyle}
                formatter={(v: unknown) => [formatCost(Number(v)), 'Cost']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Model detail list */}
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          {breakdown.map((item, i) => (
            <div key={item.model} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: MODEL_PIE_COLORS[i % MODEL_PIE_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                {shortenModel(item.model)}
              </span>
              <span className="shrink-0 tabular-nums font-medium">
                {formatCost(item.cost)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground w-10 text-right">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.request_count}req
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
