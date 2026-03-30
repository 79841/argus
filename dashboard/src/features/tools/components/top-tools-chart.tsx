'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import type { ToolUsageRow } from '@/shared/lib/queries'
import { TOP_COLORS } from './constants'

const formatNumber = (n: number): string => n.toLocaleString()

export const TopToolsChart = ({ data }: { data: ToolUsageRow[] }) => {
  const { t } = useLocale()
  const router = useRouter()
  const chartData = data.slice(0, 15).map((r) => ({
    name: r.tool_name,
    count: r.invocation_count,
    success: r.success_count,
    fail: r.fail_count,
    avgMs: Math.round(r.avg_duration_ms),
  }))

  return (
    <ChartCard
      title={t('tools.chart.topTools')}
      height={360}
      empty={chartData.length === 0}
    >
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
              horizontal={false}
            />
            <XAxis type="number" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={CHART_THEME.axis.fontSize}
              width={130}
              tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 18)}...` : v)}
            />
            <Tooltip
              contentStyle={CHART_THEME.tooltip.containerStyle}
              labelStyle={CHART_THEME.tooltip.labelStyle}
              itemStyle={CHART_THEME.tooltip.itemStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as typeof chartData[number]
                return (
                  <div style={CHART_THEME.tooltip.containerStyle}>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(d.count)} {t('tools.chart.callsUnit')} ({d.success} {t('tools.chart.okUnit')}, {d.fail} {t('tools.chart.failUnit')})
                    </p>
                    <p className="text-sm text-muted-foreground">{t('tools.chart.avgPrefix')}{d.avgMs}ms</p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              onClick={(d: { name?: string }) => {
                if (d.name) router.push(`/tools/${encodeURIComponent(d.name)}`)
              }}
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.name} fill={TOP_COLORS[i % TOP_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
