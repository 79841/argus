'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Treemap,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AGENTS } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import { calculateEfficiency } from '@/lib/efficiency'
import type { EfficiencyResult } from '@/lib/efficiency'
import type {
  DailyStats,
  ModelUsage,
  SessionRow,
  ProjectRow,
  EfficiencyRow,
  EfficiencyComparisonRow,
} from '@/lib/queries'
import { useTopBar } from '@/components/top-bar-context'

const AGENT_KEYS = ['codex', 'claude', 'gemini'] as const

type EfficiencyApiResponse = {
  data: EfficiencyRow[]
  comparison: {
    current: EfficiencyComparisonRow[]
    previous: EfficiencyComparisonRow[]
  }
}

type TreemapNode = {
  name: string
  size: number
  agent_type: string
}

type AgentEfficiencyCard = {
  agent_type: string
  name: string
  color: string
  current: EfficiencyResult
  previous: EfficiencyResult | null
}

const formatDate = (label: unknown) => {
  const d = new Date(String(label))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatCost = (value: number): string => `$${value.toFixed(3)}`

const formatCostShort = (value: unknown) => `$${Number(value).toFixed(2)}`

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatDuration = (ms: number): string => {
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const calcChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

const AGENT_BADGE_CLASSES: Record<string, string> = {
  codex: 'bg-emerald-500 text-white',
  claude: 'bg-orange-500 text-white',
  gemini: 'bg-blue-500 text-white',
}

const buildDailyCostData = (data: DailyStats[], agentType: string) => {
  if (agentType !== 'all') {
    return data
      .map((row) => ({ date: row.date, [agentType]: row.cost }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const grouped: Record<string, Record<string, number>> = {}
  for (const row of data) {
    if (!grouped[row.date]) grouped[row.date] = {}
    grouped[row.date][row.agent_type] = (grouped[row.date][row.agent_type] ?? 0) + row.cost
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

const buildTreemapData = (models: ModelUsage[]): TreemapNode[] => {
  return models
    .filter((m) => m.cost > 0)
    .map((m) => ({
      name: m.model.split('/').pop() ?? m.model,
      size: m.cost,
      agent_type: m.agent_type,
    }))
}

const toEffResult = (row: EfficiencyComparisonRow): EfficiencyResult =>
  calculateEfficiency({
    cacheReadTokens: Number(row.total_cache_read),
    inputTokens: Number(row.total_input),
    outputTokens: Number(row.total_output),
    requestCount: Number(row.total_requests),
    costUsd: Number(row.cost),
    totalDurationMs: Number(row.total_duration_ms),
  })

const buildEfficiencyCards = (
  effData: EfficiencyRow[],
  comparison: { current: EfficiencyComparisonRow[]; previous: EfficiencyComparisonRow[] },
): AgentEfficiencyCard[] => {
  const currentMap: Record<string, EfficiencyComparisonRow> = {}
  for (const row of comparison.current) currentMap[row.agent_type] = row
  const previousMap: Record<string, EfficiencyComparisonRow> = {}
  for (const row of comparison.previous) previousMap[row.agent_type] = row

  const agents = new Set(effData.map((r) => r.agent_type))

  return AGENT_KEYS
    .filter((key) => agents.has(key) || currentMap[key])
    .map((key) => {
      const cur = currentMap[key]
      const current = cur
        ? toEffResult(cur)
        : calculateEfficiency({ cacheReadTokens: 0, inputTokens: 0, outputTokens: 0, requestCount: 0, costUsd: 0, totalDurationMs: 0 })

      const prev = previousMap[key]
      const previous = prev ? toEffResult(prev) : null

      return {
        agent_type: key,
        name: AGENTS[key].name,
        color: AGENTS[key].hex,
        current,
        previous,
      }
    })
}

type TreemapContentProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  agent_type?: string
  size?: number
}

const TreemapContent = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  agent_type = '',
  size = 0,
}: TreemapContentProps) => {
  const color = AGENTS[agent_type as AgentType]?.hex ?? '#8b5cf6'
  const showLabel = width > 50 && height > 30

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.85} rx={4} stroke="#fff" strokeWidth={2} />
      {showLabel && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.9}>
            {formatCost(size)}
          </text>
        </>
      )}
    </g>
  )
}

const ChangeArrow = ({ value, invert = false }: { value: number | null; invert?: boolean }) => {
  if (value === null) return <span className="text-xs text-muted-foreground">-</span>
  const isPositive = value > 0
  const color = invert
    ? (isPositive ? 'text-red-500' : 'text-green-500')
    : (isPositive ? 'text-green-500' : 'text-red-500')
  const arrow = isPositive ? '\u2191' : '\u2193'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow}{Math.abs(value).toFixed(1)}%
    </span>
  )
}

export default function CostPage() {
  const { agentType, project, dateRange } = useTopBar()
  const [daily, setDaily] = useState<DailyStats[]>([])
  const [models, setModels] = useState<ModelUsage[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [effData, setEffData] = useState<EfficiencyRow[]>([])
  const [effComparison, setEffComparison] = useState<{
    current: EfficiencyComparisonRow[]
    previous: EfficiencyComparisonRow[]
  }>({ current: [], previous: [] })
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&from=${dateRange.from}&to=${dateRange.to}`
    Promise.all([
      fetch(`/api/daily?${q}`).then((r) => r.json()),
      fetch(`/api/models?${q}`).then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch(`/api/efficiency?project=${project}&from=${dateRange.from}&to=${dateRange.to}`).then((r) => r.json()),
      fetch(`/api/sessions?${q}`).then((r) => r.json()),
    ])
      .then(([dailyData, modelsData, projectsData, effResponse, sessionsData]) => {
        setDaily(dailyData as DailyStats[])
        setModels(modelsData as ModelUsage[])
        setProjects(projectsData as ProjectRow[])
        const eff = effResponse as EfficiencyApiResponse
        setEffData(eff.data)
        setEffComparison(eff.comparison)
        setSessions(sessionsData as SessionRow[])
        setLoading(false)
      })
      .catch(() => {
        setDaily([])
        setModels([])
        setProjects([])
        setEffData([])
        setEffComparison({ current: [], previous: [] })
        setSessions([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  const dailyCostData = useMemo(() => buildDailyCostData(daily, agentType), [daily, agentType])
  const treemapData = useMemo(() => buildTreemapData(models), [models])
  const efficiencyCards = useMemo(() => buildEfficiencyCards(effData, effComparison), [effData, effComparison])
  const highCostSessions = useMemo(
    () => [...sessions].sort((a, b) => b.cost - a.cost).slice(0, 50),
    [sessions],
  )
  const activeAgentKeys = agentType === 'all' ? AGENT_KEYS : [agentType] as const
  const projectBarData = useMemo(
    () => projects.filter((p) => p.total_cost > 0).sort((a, b) => b.total_cost - a.total_cost).slice(0, 15),
    [projects],
  )

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7.5rem)] items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 overflow-hidden">
      {/* Row 1: Daily Cost Trend + Model Cost Breakdown */}
      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="flex min-w-0 flex-1 flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Daily Cost Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                  <YAxis tickFormatter={formatCostShort} fontSize={12} />
                  <Tooltip formatter={formatCostShort} labelFormatter={formatDate} />
                  <Legend />
                  {activeAgentKeys.map((key) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={AGENTS[key as AgentType].name}
                      stroke={AGENTS[key as AgentType].hex}
                      fill={AGENTS[key as AgentType].hex}
                      fillOpacity={0.3}
                      stackId="cost"
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex w-96 flex-shrink-0 flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Model Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {treemapData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No model data
              </div>
            ) : (
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    stroke="#fff"
                    content={<TreemapContent />}
                  />
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Cost by Project + Cost Efficiency */}
      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="flex min-w-0 flex-1 flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost by Project</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {projectBarData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No project data
              </div>
            ) : (
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectBarData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tickFormatter={formatCostShort} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="project_name"
                      fontSize={12}
                      width={120}
                      tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}...` : v)}
                    />
                    <Tooltip formatter={(value) => formatCost(Number(value))} />
                    <Bar dataKey="total_cost" name="Cost" radius={[0, 4, 4, 0]}>
                      {projectBarData.map((_, index) => (
                        <Cell key={index} fill={AGENTS.all.hex} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex w-96 flex-shrink-0 flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto">
            {efficiencyCards.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No efficiency data
              </div>
            ) : (
              <div className="space-y-3">
                {efficiencyCards.map((card) => {
                  const cacheChange = card.previous
                    ? calcChange(card.current.cacheEfficiency, card.previous.cacheEfficiency)
                    : null
                  const tokenChange = card.previous
                    ? calcChange(card.current.tokenEfficiency, card.previous.tokenEfficiency)
                    : null

                  return (
                    <div key={card.agent_type} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: card.color }} />
                        <span className="text-sm font-medium">{card.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="text-muted-foreground">Cache Efficiency</div>
                        <div className="text-right font-medium">
                          {formatPercent(card.current.cacheEfficiency)}{' '}
                          <ChangeArrow value={cacheChange} />
                        </div>
                        <div className="text-muted-foreground">Token Ratio (out/in)</div>
                        <div className="text-right font-medium">
                          {formatPercent(card.current.tokenEfficiency)}{' '}
                          <ChangeArrow value={tokenChange} />
                        </div>
                        <div className="text-muted-foreground">Req / Dollar</div>
                        <div className="text-right font-medium">
                          {card.current.requestsPerDollar.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: High Cost Sessions */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium">High Cost Sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {highCostSessions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No session data
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Agent</th>
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-3 py-2 text-left font-medium">Project</th>
                </tr>
              </thead>
              <tbody>
                {highCostSessions.map((session) => (
                  <tr key={session.session_id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Badge className={AGENT_BADGE_CLASSES[session.agent_type] ?? 'bg-violet-500 text-white'}>
                        {session.agent_type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {session.model?.split('/').pop() ?? session.model}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatCost(session.cost)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatTokens(session.input_tokens + session.output_tokens)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDuration(session.duration_ms)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {session.project_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
