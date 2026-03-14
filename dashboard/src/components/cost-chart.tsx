'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyStats } from '@/lib/queries'
import { AGENTS } from '@/lib/agents'

export type ConfigChangeMarker = {
  date: string
  files: string[]
}

type CostChartProps = {
  data: DailyStats[]
  agentType: string
  configChanges?: ConfigChangeMarker[]
}

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatCost = (value: unknown) => `$${Number(value).toFixed(2)}`

export const CostChart = ({ data, agentType, configChanges = [] }: CostChartProps) => {
  if (agentType === 'all') {
    const grouped = data.reduce<Record<string, Record<string, number>>>((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = {}
      }
      acc[row.date][row.agent_type] = row.cost
      return acc
    }, {})

    const chartData = Object.entries(grouped)
      .map(([date, agents]) => ({
        date,
        codex: agents.codex ?? 0,
        claude: agents.claude ?? 0,
        gemini: agents.gemini ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Daily Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                <YAxis tickFormatter={formatCost} fontSize={12} />
                <Tooltip
                  formatter={formatCost}
                  labelFormatter={formatDate}
                />
                <Legend />
                {configChanges.map((marker) => (
                  <ReferenceLine
                    key={`config-${marker.date}`}
                    x={marker.date}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: '\u2699', position: 'top', fontSize: 14 }}
                  />
                ))}
                {AGENT_KEYS.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={AGENTS[key].name}
                    stroke={AGENTS[key].hex}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data
    .map((row) => ({
      date: row.date,
      cost: row.cost,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const color = AGENTS[agentType as keyof typeof AGENTS]?.hex ?? '#8b5cf6'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Daily Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis tickFormatter={formatCost} fontSize={12} />
              <Tooltip
                formatter={formatCost}
                labelFormatter={formatDate}
              />
              {configChanges.map((marker) => (
                <ReferenceLine
                  key={`config-${marker.date}`}
                  x={marker.date}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: '\u2699', position: 'top', fontSize: 14 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="cost"
                name="Cost"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
