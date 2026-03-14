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
import type { EfficiencyRow } from '@/lib/queries'
import { AGENTS } from '@/lib/agents'

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

type AgentEfficiency = {
  agent_type: string
  name: string
  efficiency: EfficiencyResult
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

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatPercent = (value: unknown) => `${(Number(value) * 100).toFixed(0)}%`

const aggregateByAgent = (data: EfficiencyRow[]) => {
  const map: Record<string, { cacheRead: number; input: number; requests: number; cost: number }> = {}

  for (const row of data) {
    if (!map[row.agent_type]) {
      map[row.agent_type] = { cacheRead: 0, input: 0, requests: 0, cost: 0 }
    }
    const agg = map[row.agent_type]
    agg.cacheRead += Number(row.total_cache_read)
    agg.input += Number(row.total_input)
    agg.requests += Number(row.total_requests)
    agg.cost += Number(row.cost)
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

const buildEfficiencyCards = (agentMap: Record<string, { cacheRead: number; input: number; requests: number; cost: number }>): AgentEfficiency[] => {
  return AGENT_KEYS
    .filter((key) => agentMap[key])
    .map((key) => ({
      agent_type: key,
      name: AGENTS[key].name,
      efficiency: calculateEfficiency({
        cacheReadTokens: agentMap[key].cacheRead,
        inputTokens: agentMap[key].input,
        requestCount: agentMap[key].requests,
        costUsd: agentMap[key].cost,
      }),
    }))
}

export default function EfficiencyPage() {
  const [project, setProject] = useState('all')
  const [data, setData] = useState<EfficiencyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/efficiency?days=7&project=${project}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        setData([])
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
  const efficiencyCards = buildEfficiencyCards(agentMap)
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
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cache Efficiency</span>
                  <span className="font-medium">
                    {(agent.efficiency.cacheEfficiency * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Efficiency</span>
                  <span className="font-medium">
                    {(agent.efficiency.costEfficiency * 100).toFixed(1)}%
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
