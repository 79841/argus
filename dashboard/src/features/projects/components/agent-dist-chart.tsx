'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCostChart } from '@/shared/lib/format'

const AGENT_COLORS: Record<string, string> = {
  claude: 'var(--agent-claude)',
  codex: 'var(--agent-codex)',
  gemini: 'var(--agent-gemini)',
}

type PieEntry = {
  name: string
  value: number
}

type AgentDistChartProps = {
  data: PieEntry[]
}

export const AgentDistChart = ({ data }: AgentDistChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
          }
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={AGENT_COLORS[entry.name] ?? `oklch(0.55 0.12 ${(index * 60 + 200) % 360})`}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
          contentStyle={CHART_THEME.tooltip.containerStyle}
          labelStyle={CHART_THEME.tooltip.labelStyle}
          itemStyle={CHART_THEME.tooltip.itemStyle}
        />
        <Legend
          formatter={(value) => value}
          {...CHART_THEME.legend}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
