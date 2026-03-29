'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
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
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2">
        {data.map((entry, index) => {
          const color = AGENT_COLORS[entry.name] ?? `oklch(0.55 0.12 ${(index * 60 + 200) % 360})`
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
              <span className="font-medium tabular-nums">{pct}%</span>
              <span className="text-muted-foreground tabular-nums">·</span>
              <span className="text-muted-foreground tabular-nums">{formatCostChart(entry.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
