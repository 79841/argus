'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import type { OverviewStats, ModelUsage, DailyStats, ToolUsageRow, SessionRow, AllTimeStats } from '@/lib/queries'
import { useTopBar } from '@/components/top-bar-context'
import { AGENTS } from '@/lib/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageHeatmap } from '@/components/usage-heatmap'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatCost = (value: number): string => `$${value.toFixed(2)}`

const AGENT_PALETTE: Record<string, string[]> = {
  codex: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  claude: ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  gemini: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
}

const DEFAULT_COLORS = [
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9',
  '#5b21b6', '#4c1d95',
]

const getModelColor = (agentType: string, index: number): string => {
  const palette = AGENT_PALETTE[agentType]
  if (palette) return palette[index % palette.length]
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

const TOOL_COLORS = [
  '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e', '#22d3ee',
]

const formatDuration = (ms: number): string => {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.round((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

const formatSessionTime = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OverviewPage() {
  const router = useRouter()
  const { agentType, project, dateRange } = useTopBar()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [allTime, setAllTime] = useState<AllTimeStats>({ total_cost: 0, total_tokens: 0 })
  const [models, setModels] = useState<ModelUsage[]>([])
  const [daily, setDaily] = useState<DailyStats[]>([])
  const [tools, setTools] = useState<ToolUsageRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pricing-sync', { method: 'POST' }).catch(() => {})
  }, [])

  const fetchData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&from=${dateRange.from}&to=${dateRange.to}`
    Promise.all([
      fetch(`/api/overview?${q}`).then((r) => r.json()),
      fetch(`/api/models?${q}`).then((r) => r.json()),
      fetch(`/api/daily?${q}`).then((r) => r.json()),
      fetch(`/api/tools?${q}`).then((r) => r.json()),
      fetch(`/api/sessions?${q}&limit=10`).then((r) => r.json()),
    ])
      .then(([statsData, modelsData, dailyData, toolsData, sessionsData]) => {
        const { all_time_cost, all_time_tokens, ...rest } = statsData as OverviewStats & { all_time_cost: number; all_time_tokens: number }
        setStats(rest as OverviewStats)
        setAllTime({ total_cost: all_time_cost ?? 0, total_tokens: all_time_tokens ?? 0 })
        setModels(modelsData as ModelUsage[])
        setDaily(dailyData as DailyStats[])
        setTools((toolsData as { tools: ToolUsageRow[] }).tools ?? [])
        setSessions(Array.isArray(sessionsData) ? sessionsData as SessionRow[] : [])
        setLoading(false)
      })
      .catch(() => {
        setStats(null)
        setAllTime({ total_cost: 0, total_tokens: 0 })
        setModels([])
        setDaily([])
        setTools([])
        setSessions([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  useAutoRefresh(useCallback(() => fetchData(false), [fetchData]))

  const modelPieData = useMemo(() => {
    const total = models.reduce((sum, d) => sum + d.request_count, 0)
    return { data: models.map((d, i) => ({ ...d, fill: getModelColor(d.agent_type, i) })), total }
  }, [models])

  const toolChartData = useMemo(() => {
    return tools.slice(0, 15).map((row) => ({
      name: row.tool_name,
      count: row.invocation_count,
      success: row.success_count,
      fail: row.fail_count,
      avgMs: Math.round(row.avg_duration_ms),
    }))
  }, [tools])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 p-1">
        <div className="flex flex-[35] gap-4">
          <div className="grid w-72 shrink-0 grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="flex-1 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex flex-[35] gap-4">
          <div className="flex-1 animate-pulse rounded-xl bg-muted" />
          <div className="w-80 shrink-0 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex-[30] animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 p-1">
      {/* Row 1 (35%): KPI 2x2 + Model Pie */}
      <div className="flex min-h-0 flex-[35] gap-4">
        {/* KPI Cards 2x2 */}
        <div className="grid w-72 shrink-0 grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Sessions</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{stats?.total_sessions ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="cursor-help" title={[
            'Claude: API cost_usd',
            'Codex/Gemini: LiteLLM pricing',
          ].join('\n')}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Cost</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{formatCost(stats?.total_cost ?? 0)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">All time: {formatCost(allTime.total_cost)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tokens</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{formatTokens((stats?.total_input_tokens ?? 0) + (stats?.total_output_tokens ?? 0) + (stats?.total_cache_read_tokens ?? 0))}</div>
              <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                <div>In: {formatTokens(stats?.total_input_tokens ?? 0)}</div>
                <div>Out: {formatTokens(stats?.total_output_tokens ?? 0)}</div>
                <div>Cache: {formatTokens(stats?.total_cache_read_tokens ?? 0)}</div>
                <div className="mt-0.5 border-t border-border/50 pt-0.5">All time: {formatTokens(allTime.total_tokens)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Cache Hit</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold">{((stats?.cache_hit_rate ?? 0) * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Model Pie Chart */}
        <Card className="min-w-0 flex-1">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Models</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2.5rem)] px-2 pb-2">
            {modelPieData.data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelPieData.data}
                    dataKey="request_count"
                    nameKey="model"
                    cx="50%"
                    cy="45%"
                    outerRadius="70%"
                    innerRadius="40%"
                    paddingAngle={2}
                  >
                    {modelPieData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0]
                      const count = item.value as number
                      const pct = modelPieData.total > 0 ? ((count / modelPieData.total) * 100).toFixed(1) : '0.0'
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{count.toLocaleString()} ({pct}%)</p>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    formatter={(value: string) => value.length > 20 ? `${value.slice(0, 18)}...` : value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 (35%): Recent Sessions + Tool Usage */}
      <div className="flex min-h-0 flex-[35] gap-4">
        {/* Recent Sessions */}
        <Card className="min-w-0 flex-1">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2.5rem)] overflow-y-auto px-4 pb-3">
            {sessions.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sessions
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                    <th className="pb-2 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr
                      key={s.session_id}
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                      onClick={() => router.push('/sessions')}
                    >
                      <td className="py-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full mr-1.5"
                          style={{ backgroundColor: AGENTS[s.agent_type as keyof typeof AGENTS]?.hex ?? '#8b5cf6' }}
                        />
                        {AGENTS[s.agent_type as keyof typeof AGENTS]?.name ?? s.agent_type}
                      </td>
                      <td className="py-1.5 max-w-[120px] truncate">{s.model || '-'}</td>
                      <td className="py-1.5 text-muted-foreground">{formatSessionTime(s.started_at)}</td>
                      <td className="py-1.5 text-right">{formatCost(s.cost)}</td>
                      <td className="py-1.5 text-right">{formatTokens(s.input_tokens + s.output_tokens)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatDuration(s.duration_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card className="w-80 shrink-0">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-2.5rem)] px-2 pb-2">
            {toolChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No tool data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={10}
                    width={100}
                    tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 12)}...` : v}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as typeof toolChartData[number]
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <p className="text-xs font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.count} calls ({d.success} ok, {d.fail} fail)
                          </p>
                          <p className="text-xs text-muted-foreground">avg {d.avgMs}ms</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {toolChartData.map((entry, i) => (
                      <Cell key={entry.name} fill={TOOL_COLORS[i % TOOL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 (30%): Usage Heatmap */}
      <div className="min-h-0 flex-[30]">
        <UsageHeatmap data={daily} agentType={agentType} />
      </div>
    </div>
  )
}
