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
import { useLocale } from '@/shared/lib/i18n'
import type { DailyToolRow } from '@/shared/lib/queries'

export const FailRateTrendChart = ({ data }: { data: DailyToolRow[] }) => {
  const { t } = useLocale()
  const byDate: Record<string, { count: number }> = {}

  for (const r of data) {
    if (!byDate[r.date]) byDate[r.date] = { count: 0 }
    byDate[r.date].count += r.count
  }

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { count }]) => ({
      date: date.slice(5),
      total: count,
    }))

  return (
    <ChartCard
      title={t('tools.chart.dailyTotal')}
      height={240}
      empty={chartData.length === 0}
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
            />
            <XAxis dataKey="date" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis fontSize={CHART_THEME.axis.fontSize} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} />
            <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('tools.chart.totalCalls')} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
