'use client'

import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { AGENTS } from '@/shared/lib/agents'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCostDetail, formatTokens } from '@/shared/lib/format'
import type { AgentDistribution } from '@/shared/lib/queries'
import { useLocale } from '@/shared/lib/i18n'

type AgentDonutChartProps = {
  data: AgentDistribution[]
}

type Metric = 'sessions' | 'tokens' | 'cost'

const formatValue = (metric: Metric, value: number): string => {
  if (metric === 'cost') return formatCostDetail(value)
  if (metric === 'tokens') return formatTokens(value)
  return String(value)
}

type TooltipPayloadItem = {
  name: string
  value: number
  payload: { name: string; value: number; total: number }
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  metric: Metric
}

const CustomTooltip = ({ active, payload, metric }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  const percent = item.payload.total > 0
    ? ((item.value / item.payload.total) * 100).toFixed(1)
    : '0.0'
  return (
    <div style={CHART_THEME.tooltip.containerStyle}>
      <p style={CHART_THEME.tooltip.labelStyle}>{item.name}</p>
      <p style={CHART_THEME.tooltip.itemStyle}>
        {formatValue(metric, item.value)} ({percent}%)
      </p>
    </div>
  )
}

const LABEL_MIN_PERCENT = 0.05

type LabelProps = {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  name: string
  percent: number
  value: number
  metric: Metric
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  percent,
  value,
  metric,
}: LabelProps) => {
  if (percent < LABEL_MIN_PERCENT) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 16
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="var(--text-secondary)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
      fontFamily="var(--font-mono)"
    >
      {`${name} ${(percent * 100).toFixed(1)}%`}
      <tspan x={x} dy={13} fill="var(--text-tertiary)" fontSize={9}>
        {formatValue(metric, value)}
      </tspan>
    </text>
  )
}

export const AgentDonutChart = ({ data }: AgentDonutChartProps) => {
  const [metric, setMetric] = useState<Metric>('sessions')
  const { t } = useLocale()

  const METRIC_TABS: { key: Metric; label: string }[] = [
    { key: 'sessions', label: t('dashboard.agentDonut.sessions') },
    { key: 'tokens', label: t('dashboard.agentDonut.tokens') },
    { key: 'cost', label: t('dashboard.agentDonut.cost') },
  ]

  const { chartData, isEmpty } = useMemo(() => {
    const filtered = data.filter((d) => d[metric] > 0)
    const total = filtered.reduce((sum, d) => sum + d[metric], 0)
    const items = filtered.map((d) => ({
      name: AGENTS[d.agent_type as keyof typeof AGENTS]?.name ?? d.agent_type,
      value: d[metric],
      total,
      agentType: d.agent_type,
    }))
    return { chartData: items, isEmpty: items.length === 0 }
  }, [data, metric])

  const actions = (
    <div className="flex items-center gap-1">
      {METRIC_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setMetric(tab.key)}
          className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
            metric === tab.key
              ? 'font-semibold bg-muted text-foreground'
              : 'font-medium text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartCard
      title={t('dashboard.agentDonut.title')}
      height={260}
      empty={isEmpty}
      emptyMessage={t('dashboard.agentDonut.noData')}
      actions={actions}
    >
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            dataKey="value"
            nameKey="name"
            label={(props: PieLabelRenderProps) => renderCustomLabel({
              cx: Number(props.cx),
              cy: Number(props.cy),
              midAngle: Number(props.midAngle),
              innerRadius: Number(props.innerRadius),
              outerRadius: Number(props.outerRadius),
              name: String(props.name),
              percent: Number(props.percent),
              value: Number(props.value),
              metric,
            })}
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.agentType}`}
                fill={
                  AGENTS[entry.agentType as keyof typeof AGENTS]?.cssVar ??
                  `oklch(0.55 0.12 ${(chartData.indexOf(entry) * 60 + 200) % 360})`
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip metric={metric} />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
