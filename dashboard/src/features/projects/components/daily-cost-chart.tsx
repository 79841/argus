'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCost, formatCostChart } from '@/shared/lib/format'

type AreaEntry = {
  date: string
  label: string
  cost: number
}

type DailyCostChartProps = {
  data: AreaEntry[]
}

export const DailyCostChart = ({ data }: DailyCostChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="projectCostGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.62 0.17 300)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.62 0.17 300)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          {...CHART_THEME.axis}
        />
        <YAxis
          tickFormatter={(v) => formatCost(Number(v))}
          {...CHART_THEME.axis}
        />
        <Tooltip
          formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
          contentStyle={CHART_THEME.tooltip.containerStyle}
          labelStyle={CHART_THEME.tooltip.labelStyle}
          itemStyle={CHART_THEME.tooltip.itemStyle}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="oklch(0.62 0.17 300)"
          fill="url(#projectCostGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
