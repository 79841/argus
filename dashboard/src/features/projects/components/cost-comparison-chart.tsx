'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCost, formatCostChart } from '@/shared/lib/format'

const COLORS = [
  '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
]

type ChartEntry = {
  name: string
  fullName: string
  cost: number
}

type CostComparisonChartProps = {
  data: ChartEntry[]
}

export const CostComparisonChart = ({ data }: CostComparisonChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => formatCost(Number(v))}
          {...CHART_THEME.axis}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 16)}…` : v}
          {...CHART_THEME.axis}
        />
        <Tooltip
          formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
          labelFormatter={(_label, payload) => {
            if (payload?.[0]) {
              return (payload[0].payload as { fullName: string }).fullName
            }
            return _label
          }}
          contentStyle={CHART_THEME.tooltip.containerStyle}
          labelStyle={CHART_THEME.tooltip.labelStyle}
          itemStyle={CHART_THEME.tooltip.itemStyle}
        />
        <Bar dataKey="cost" radius={[0, 3, 3, 0]}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
