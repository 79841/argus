'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { CHART_THEME } from '@/shared/lib/chart-theme'

type TrendPoint = {
  date: string
  value: number
}

type ToolTrendChartProps = {
  data: TrendPoint[]
  title: string
  yAxisLabel?: string
  color?: string
  formatter?: (value: number) => string
}

export const ToolTrendChart = ({
  data,
  title,
  color = 'oklch(0.55 0.15 280)',
  formatter,
}: ToolTrendChartProps) => {
  return (
    <ChartCard title={title} height={200} empty={data.length === 0}>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
            />
            <XAxis
              dataKey="date"
              fontSize={CHART_THEME.axis.fontSize}
              tickLine={false}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              fontSize={CHART_THEME.axis.fontSize}
              tickLine={false}
              tickFormatter={formatter}
              width={48}
            />
            <Tooltip
              contentStyle={CHART_THEME.tooltip.containerStyle}
              labelStyle={CHART_THEME.tooltip.labelStyle}
              itemStyle={CHART_THEME.tooltip.itemStyle}
              formatter={
                formatter
                  ? (v: unknown) => [formatter(v as number), '']
                  : undefined
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
