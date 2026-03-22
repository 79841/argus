'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCostDetail, formatCostChart } from '@/shared/lib/format'

export type CostChartDatum = {
  label: string
  cost: number
  toolCount: number
}

export type PromptCostChartProps = {
  data: CostChartDatum[]
  title: string
}

export const PromptCostChart = ({ data, title }: PromptCostChartProps) => {
  if (data.length === 0) return null

  return (
    <div className="rounded-lg p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis
            dataKey="label"
            tick={{ ...CHART_THEME.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={CHART_THEME.axis.axisLine}
          />
          <YAxis
            tickFormatter={(v: number) => formatCostDetail(v)}
            tick={{ ...CHART_THEME.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={CHART_THEME.axis.axisLine}
            width={60}
          />
          <Tooltip
            contentStyle={CHART_THEME.tooltip.containerStyle}
            labelStyle={CHART_THEME.tooltip.labelStyle}
            itemStyle={CHART_THEME.tooltip.itemStyle}
            formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
          />
          <Bar
            dataKey="cost"
            fill="oklch(0.55 0.12 280)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
