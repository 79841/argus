'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectFilter } from '@/components/project-filter'
import { AgentComparison } from '@/components/agent-comparison'
import { calculateEfficiency, getScoreColor, getScoreBg } from '@/lib/efficiency'
import type { EfficiencyResult } from '@/lib/efficiency'
import type { EfficiencyRow, EfficiencyComparisonRow } from '@/lib/queries'
import { AGENTS } from '@/lib/agents'

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

type AgentEfficiency = {
  agent_type: string
  name: string
  efficiency: EfficiencyResult
  changes: {
    score: number | null
    tokenEfficiency: number | null
    avgDurationMs: number | null
    cacheEfficiency: number | null
    costEfficiency: number | null
  }
}

type CacheChartRow = {
  date: string
  codex: number
  claude: number
  gemini: number
}

type ComparisonRow = {
  agent_type: string
  cost: number
  requests: number
}

type ApiResponse = {
  data: EfficiencyRow[]
  comparison: {
    current: EfficiencyComparisonRow[]
    previous: EfficiencyComparisonRow[]
  }
}

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatPercent = (value: unknown) => `${(Number(value) * 100).toFixed(0)}%`

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const formatChangePercent = (value: number | null): string => {
  if (value === null) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const getChangeColor = (value: number | null, invertColor: boolean = false): string => {
  if (value === null) return 'text-muted-foreground'
  if (value > 0) return invertColor ? 'text-red-600' : 'text-green-600'
  if (value < 0) return invertColor ? 'text-green-600' : 'text-red-600'
  return 'text-muted-foreground'
}

const getChangeArrow = (value: number | null): string => {
  if (value === null) return ''
  if (value > 0) return '\u2191'
  if (value < 0) return '\u2193'
  return ''
}

const calcPercentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

const aggregateByAgent = (data: EfficiencyRow[]) => {
  const map: Record<string, { cacheRead: number; input: number; output: number; requests: number; cost: number; durationMs: number }> = {}

  for (const row of data) {
    if (!map[row.agent_type]) {
      map[row.agent_type] = { cacheRead: 0, input: 0, output: 0, requests: 0, cost: 0, durationMs: 0 }
    }
    const agg = map[row.agent_type]
    agg.cacheRead += Number(row.total_cache_read)
    agg.input += Number(row.total_input)
    agg.output += Number(row.total_output)
    agg.requests += Number(row.total_requests)
    agg.cost += Number(row.cost)
    agg.durationMs += Number(row.total_duration_ms)
  }

  return map
}

const buildCacheChartData = (data: EfficiencyRow[]): CacheChartRow[] => {
  const grouped: Record<string, Record<string, number>> = {}

  for (const row of data) {
    if (!grouped[row.date]) {
      grouped[row.date] = {}
    }
    grouped[row.date][row.agent_type] = Number(row.cache_hit_rate)
  }

  return Object.entries(grouped)
    .map(([date, agents]) => ({
      date,
      codex: agents.codex ?? 0,
      claude: agents.claude ?? 0,
      gemini: agents.gemini ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const buildComparisonData = (agentMap: Record<string, { cost: number; requests: number }>): ComparisonRow[] => {
  return AGENT_KEYS
    .filter((key) => agentMap[key])
    .map((key) => ({
      agent_type: key,
      cost: agentMap[key].cost,
      requests: agentMap[key].requests,
    }))
}

const buildPreviousMap = (rows: EfficiencyComparisonRow[]): Record<string, EfficiencyResult> => {
  const map: Record<string, EfficiencyResult> = {}
  for (const row of rows) {
    map[row.agent_type] = calculateEfficiency({
      cacheReadTokens: Number(row.total_cache_read),
      inputTokens: Number(row.total_input),
      outputTokens: Number(row.total_output),
      requestCount: Number(row.total_requests),
      costUsd: Number(row.cost),
      totalDurationMs: Number(row.total_duration_ms),
    })
  }
  return map
}

const buildEfficiencyCards = (
  agentMap: Record<string, { cacheRead: number; input: number; output: number; requests: number; cost: number; durationMs: number }>,
  previousMap: Record<string, EfficiencyResult>,
): AgentEfficiency[] => {
  return AGENT_KEYS
    .filter((key) => agentMap[key])
    .map((key) => {
      const efficiency = calculateEfficiency({
        cacheReadTokens: agentMap[key].cacheRead,
        inputTokens: agentMap[key].input,
        outputTokens: agentMap[key].output,
        requestCount: agentMap[key].requests,
        costUsd: agentMap[key].cost,
        totalDurationMs: agentMap[key].durationMs,
      })

      const prev = previousMap[key]
      const changes = prev
        ? {
            score: calcPercentChange(efficiency.score, prev.score),
            tokenEfficiency: calcPercentChange(efficiency.tokenEfficiency, prev.tokenEfficiency),
            avgDurationMs: calcPercentChange(efficiency.avgDurationMs, prev.avgDurationMs),
            cacheEfficiency: calcPercentChange(efficiency.cacheEfficiency, prev.cacheEfficiency),
            costEfficiency: calcPercentChange(efficiency.costEfficiency, prev.costEfficiency),
          }
        : {
            score: null,
            tokenEfficiency: null,
            avgDurationMs: null,
            cacheEfficiency: null,
            costEfficiency: null,
          }

      return {
        agent_type: key,
        name: AGENTS[key].name,
        efficiency,
        changes,
      }
    })
}

type ChangeIndicatorProps = {
  value: number | null
  invertColor?: boolean
}

const ChangeIndicator = ({ value, invertColor = false }: ChangeIndicatorProps) => {
  if (value === null) return null
  return (
    <span className={`ml-1 text-xs ${getChangeColor(value, invertColor)}`}>
      {getChangeArrow(value)} {formatChangePercent(value)}
    </span>
  )
}

export default function EfficiencyPage() {
  const [project, setProject] = useState('all')
  const [data, setData] = useState<EfficiencyRow[]>([])
  const [previousMap, setPreviousMap] = useState<Record<string, EfficiencyResult>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/efficiency?days=7&project=${project}`)
      .then((res) => res.json())
      .then((json: ApiResponse) => {
        setData(json.data)
        setPreviousMap(buildPreviousMap(json.comparison.previous))
        setLoading(false)
      })
      .catch(() => {
        setData([])
        setPreviousMap({})
        setLoading(false)
      })
  }, [project])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Efficiency Analysis</h1>
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          No data available
        </div>
      </div>
    )
  }

  const agentMap = aggregateByAgent(data)
  const efficiencyCards = buildEfficiencyCards(agentMap, previousMap)
  const cacheChartData = buildCacheChartData(data)
  const comparisonData = buildComparisonData(agentMap)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Efficiency Analysis</h1>
        <ProjectFilter value={project} onChange={setProject} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {efficiencyCards.map((agent) => (
          <Card key={agent.agent_type}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-lg px-3 py-1.5 text-2xl font-bold ${getScoreColor(agent.efficiency.score)} ${getScoreBg(agent.efficiency.score)}`}
                >
                  {agent.efficiency.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <ChangeIndicator value={agent.changes.score} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cache Efficiency</span>
                  <span className="font-medium">
                    {(agent.efficiency.cacheEfficiency * 100).toFixed(1)}%
                    <ChangeIndicator value={agent.changes.cacheEfficiency} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Efficiency</span>
                  <span className="font-medium">
                    {(agent.efficiency.costEfficiency * 100).toFixed(1)}%
                    <ChangeIndicator value={agent.changes.costEfficiency} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Efficiency</span>
                  <span className="font-medium">
                    {(agent.efficiency.tokenEfficiency * 100).toFixed(1)}%
                    <ChangeIndicator value={agent.changes.tokenEfficiency} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium">
                    {formatDuration(agent.efficiency.avgDurationMs)}
                    <ChangeIndicator value={agent.changes.avgDurationMs} invertColor />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cache Hit Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cacheChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                <YAxis tickFormatter={formatPercent} fontSize={12} domain={[0, 1]} />
                <Tooltip
                  formatter={(value) => formatPercent(value)}
                  labelFormatter={formatDate}
                />
                <Legend />
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

      <AgentComparison data={comparisonData} />
    </div>
  )
}
