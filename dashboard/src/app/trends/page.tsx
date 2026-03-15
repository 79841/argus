'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import type { DailyStats } from '@/lib/queries'
import type { ConfigChange } from '@/lib/config-tracker'
import type { ConfigChangeMarker } from '@/components/cost-chart'
import { useTopBar } from '@/components/top-bar-context'
import { AGENTS } from '@/lib/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
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

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatChartTokens = (value: unknown) => {
  const num = Number(value)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
  return String(num)
}

const formatChartCost = (value: unknown) => `$${Number(value).toFixed(2)}`

export default function TrendsPage() {
  const { agentType, project, dateRange } = useTopBar()
  const [daily, setDaily] = useState<DailyStats[]>([])
  const [configChanges, setConfigChanges] = useState<ConfigChangeMarker[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&from=${dateRange.from}&to=${dateRange.to}`
    Promise.all([
      fetch(`/api/daily?${q}`).then((r) => r.json()),
      fetch(`/api/config-history?days=30`).then((r) => r.json()),
    ])
      .then(([dailyData, configData]) => {
        setDaily(dailyData as DailyStats[])
        const changes = Array.isArray(configData) ? configData as ConfigChange[] : []
        const grouped = changes.reduce<Record<string, string[]>>(
          (acc, change) => {
            const dateKey = change.date.split('T')[0]
            if (!acc[dateKey]) acc[dateKey] = []
            if (!acc[dateKey].includes(change.file_path)) {
              acc[dateKey].push(change.file_path)
            }
            return acc
          },
          {}
        )
        setConfigChanges(
          Object.entries(grouped).map(([date, files]) => ({ date, files }))
        )
        setLoading(false)
      })
      .catch(() => {
        setDaily([])
        setConfigChanges([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  useAutoRefresh(useCallback(() => fetchData(false), [fetchData]))

  const costChartData = useMemo((): Record<string, unknown>[] => {
    if (agentType === 'all') {
      const grouped = daily.reduce<Record<string, Record<string, number>>>((acc, row) => {
        if (!acc[row.date]) acc[row.date] = {}
        acc[row.date][row.agent_type] = row.cost
        return acc
      }, {})
      return Object.entries(grouped)
        .map(([date, agents]) => ({
          date,
          codex: agents.codex ?? 0,
          claude: agents.claude ?? 0,
          gemini: agents.gemini ?? 0,
        }))
        .sort((a, b) => (a.date as string).localeCompare(b.date as string))
    }
    return daily
      .map((row) => ({ date: row.date, cost: row.cost }))
      .sort((a, b) => (a.date as string).localeCompare(b.date as string))
  }, [daily, agentType])

  const tokenChartData = useMemo((): Record<string, unknown>[] => {
    if (agentType === 'all') {
      const grouped = daily.reduce<Record<string, Record<string, number>>>((acc, row) => {
        if (!acc[row.date]) acc[row.date] = {}
        acc[row.date][`${row.agent_type}_cache`] = row.cache_read_tokens
        acc[row.date][`${row.agent_type}_input`] = row.input_tokens
        acc[row.date][`${row.agent_type}_output`] = row.output_tokens
        return acc
      }, {})
      return Object.entries(grouped)
        .map(([date, tokens]) => ({ date, ...tokens }))
        .sort((a, b) => (a.date as string).localeCompare(b.date as string))
    }
    return daily
      .map((row) => ({
        date: row.date,
        cache_read_tokens: row.cache_read_tokens,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
      }))
      .sort((a, b) => (a.date as string).localeCompare(b.date as string))
  }, [daily, agentType])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 p-1">
        <div className="flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const singleColor = AGENTS[agentType as keyof typeof AGENTS]?.hex ?? '#8b5cf6'

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 p-1">
      {/* Row 1: Cost Trend */}
      <Card className="min-h-0 flex-1">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-medium">Cost Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-2.5rem)] px-4 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costChartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
              <YAxis tickFormatter={formatChartCost} fontSize={11} width={50} />
              <Tooltip formatter={formatChartCost} labelFormatter={formatDate} />
              <Legend />
              {configChanges.map((marker) => (
                <ReferenceLine
                  key={`config-${marker.date}`}
                  x={marker.date}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ))}
              {agentType === 'all' ? (
                AGENT_KEYS.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={AGENTS[key].name}
                    stroke={AGENTS[key].hex}
                    strokeWidth={2}
                    dot={false}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke={singleColor}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 2: Token Trend */}
      <Card className="min-h-0 flex-1">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-medium">Token Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-2.5rem)] px-4 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokenChartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
              <YAxis tickFormatter={formatChartTokens} fontSize={11} width={50} />
              <Tooltip formatter={formatChartTokens} labelFormatter={formatDate} />
              <Legend />
              {configChanges.map((marker) => (
                <ReferenceLine
                  key={`config-${marker.date}`}
                  x={marker.date}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ))}
              {agentType === 'all' ? (
                <>
                  {AGENT_KEYS.map((key) => (
                    <Bar key={`${key}_cache`} dataKey={`${key}_cache`} name={`${AGENTS[key].name} Cache`} fill={AGENTS[key].hex} stackId={`${key}_cache`} barSize={8} opacity={0.3} />
                  ))}
                  {AGENT_KEYS.map((key) => (
                    <Bar key={`${key}_input`} dataKey={`${key}_input`} name={`${AGENTS[key].name} Input`} fill={AGENTS[key].hex} stackId={key} barSize={20} opacity={0.8} />
                  ))}
                  {AGENT_KEYS.map((key) => (
                    <Bar key={`${key}_output`} dataKey={`${key}_output`} name={`${AGENTS[key].name} Output`} fill={AGENTS[key].hex} stackId={key} barSize={20} opacity={0.5} />
                  ))}
                </>
              ) : (
                <>
                  <Bar dataKey="cache_read_tokens" name="Cache Read" fill={singleColor} stackId="cache" barSize={8} opacity={0.3} />
                  <Bar dataKey="input_tokens" name="Input" fill={singleColor} stackId="tokens" barSize={20} opacity={0.8} />
                  <Bar dataKey="output_tokens" name="Output" fill={singleColor} stackId="tokens" barSize={20} opacity={0.5} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
