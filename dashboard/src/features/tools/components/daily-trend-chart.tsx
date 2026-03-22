'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import type { DailyToolRow } from '@/shared/lib/queries'
import { TOOL_COLORS, DEFAULT_COLORS } from './constants'

export const DailyTrendChart = ({ data }: { data: DailyToolRow[] }) => {
  const { t } = useLocale()
  const toolSet = new Set<string>()
  const byDate: Record<string, Record<string, number>> = {}

  for (const r of data) {
    toolSet.add(r.tool_name)
    if (!byDate[r.date]) byDate[r.date] = {}
    byDate[r.date][r.tool_name] = r.count
  }

  const topTools = [...toolSet]
    .map((tool) => ({ name: tool, total: data.filter((r) => r.tool_name === tool).reduce((s, r) => s + r.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((tool) => tool.name)

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => {
      const row: Record<string, string | number> = { date: date.slice(5) }
      for (const tool of topTools) row[tool] = counts[tool] ?? 0
      return row
    })

  let colorIdx = 0
  const getColor = (name: string) => {
    if (TOOL_COLORS[name]) return TOOL_COLORS[name]
    if (name.startsWith('mcp')) return '#eab308'
    return DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length]
  }

  return (
    <ChartCard
      title={t('tools.chart.dailyTrend')}
      height={280}
      empty={chartData.length === 0}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
            />
            <XAxis dataKey="date" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis fontSize={CHART_THEME.axis.fontSize} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} />
            <Legend wrapperStyle={{ fontSize: `${CHART_THEME.legend.fontSize}px` }} />
            {topTools.map((tool) => (
              <Area key={tool} type="monotone" dataKey={tool} stackId="1" stroke={getColor(tool)} fill={getColor(tool)} fillOpacity={0.4} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
