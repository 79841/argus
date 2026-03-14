'use client'

import {
  BarChart,
  Bar,
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
import type { ConfigChangeMarker } from '@/components/cost-chart'
import { AGENTS } from '@/lib/agents'

type TokenChartProps = {
  data: DailyStats[]
  agentType: string
  configChanges?: ConfigChangeMarker[]
}

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatTokens = (value: unknown) => {
  const num = Number(value)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
  return String(num)
}

export const TokenChart = ({ data, agentType, configChanges = [] }: TokenChartProps) => {
  if (agentType === 'all') {
    const grouped = data.reduce<Record<string, Record<string, number>>>((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = {}
      }
      acc[row.date][`${row.agent_type}_input`] = row.input_tokens
      acc[row.date][`${row.agent_type}_output`] = row.output_tokens
      return acc
    }, {})

    const chartData = Object.entries(grouped)
      .map(([date, tokens]) => ({
        date,
        ...tokens,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Daily Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                <YAxis tickFormatter={formatTokens} fontSize={12} />
                <Tooltip
                  formatter={formatTokens}
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
                  <Bar
                    key={`${key}_input`}
                    dataKey={`${key}_input`}
                    name={`${AGENTS[key].name} Input`}
                    fill={AGENTS[key].hex}
                    stackId={key}
                    opacity={0.8}
                  />
                ))}
                {AGENT_KEYS.map((key) => (
                  <Bar
                    key={`${key}_output`}
                    dataKey={`${key}_output`}
                    name={`${AGENTS[key].name} Output`}
                    fill={AGENTS[key].hex}
                    stackId={key}
                    opacity={0.5}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data
    .map((row) => ({
      date: row.date,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const color = AGENTS[agentType as keyof typeof AGENTS]?.hex ?? '#8b5cf6'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Daily Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis tickFormatter={formatTokens} fontSize={12} />
              <Tooltip
                formatter={formatTokens}
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
              <Bar
                dataKey="input_tokens"
                name="Input Tokens"
                fill={color}
                stackId="tokens"
                opacity={0.8}
              />
              <Bar
                dataKey="output_tokens"
                name="Output Tokens"
                fill={color}
                stackId="tokens"
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
