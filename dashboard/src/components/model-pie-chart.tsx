'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ModelUsage } from '@/lib/queries'

type ModelPieChartProps = {
  data: ModelUsage[]
}

const AGENT_PALETTE: Record<string, string[]> = {
  codex: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  claude: ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  gemini: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
}

const DEFAULT_COLORS = [
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9',
  '#5b21b6', '#4c1d95',
]

const getColor = (agentType: string, index: number): string => {
  const palette = AGENT_PALETTE[agentType]
  if (palette) {
    return palette[index % palette.length]
  }
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

const toPercent = (value: number, total: number): string => {
  if (total === 0) return '0.0'
  return ((value / total) * 100).toFixed(1)
}

type TooltipPayloadItem = {
  name: string
  value: number
  payload: ModelUsage & { percent: number }
}

const CustomTooltip = ({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  total: number
}) => {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-sm text-muted-foreground">
        Requests: {item.value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">
        {toPercent(item.value, total)}%
      </p>
    </div>
  )
}

export const ModelPieChart = ({ data }: ModelPieChartProps) => {
  const total = data.reduce((sum, d) => sum + d.request_count, 0)

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No model data available
      </div>
    )
  }

  const coloredData = data.map((d, i) => ({
    ...d,
    fill: getColor(d.agent_type, i),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={coloredData}
          dataKey="request_count"
          nameKey="model"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={50}
          paddingAngle={2}
        >
          {coloredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip total={total} />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-sm">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
