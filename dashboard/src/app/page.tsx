'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import type { OverviewStats, OverviewDelta, AgentTodaySummary, DailyStats, SessionRow } from '@/lib/queries'
import { AGENTS } from '@/lib/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageHeatmap } from '@/components/usage-heatmap'

const formatCost = (v: number) => `$${v.toFixed(2)}`

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '-'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

type DeltaBadgeProps = { value: number | null; higherIsBetter?: boolean }

const DeltaBadge = ({ value, higherIsBetter = true }: DeltaBadgeProps) => {
  if (value === null) return <span className="text-[10px] text-muted-foreground">—</span>
  const positive = value >= 0
  const good = higherIsBetter ? positive : !positive
  const arrow = positive ? '▲' : '▼'
  const color = good ? 'text-emerald-500' : 'text-red-500'
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

type DashboardData = {
  stats: OverviewStats | null
  delta: OverviewDelta | null
  agentSummaries: AgentTodaySummary[]
  daily: DailyStats[]
  sessions: SessionRow[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData>({
    stats: null,
    delta: null,
    agentSummaries: [],
    daily: [],
    sessions: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pricing-sync', { method: 'POST' }).catch(() => {})
  }, [])

  const fetchData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    Promise.all([
      fetch('/api/overview').then((r) => r.json()),
      fetch('/api/daily?days=112').then((r) => r.json()),
      fetch('/api/sessions?limit=5').then((r) => r.json()),
    ])
      .then(([overviewData, dailyData, sessionsData]) => {
        setData({
          stats: overviewData as OverviewStats,
          delta: (overviewData as { delta: OverviewDelta }).delta ?? null,
          agentSummaries: (overviewData as { agent_summaries: AgentTodaySummary[] }).agent_summaries ?? [],
          daily: Array.isArray(dailyData) ? (dailyData as DailyStats[]) : [],
          sessions: Array.isArray(sessionsData) ? (sessionsData as SessionRow[]) : [],
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  useAutoRefresh(useCallback(() => fetchData(false), [fetchData]))

  const { stats, delta, agentSummaries, daily, sessions } = data

  const AGENT_ORDER = ['claude', 'codex', 'gemini'] as const

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto p-4">
      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Today Cost</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{formatCost(stats?.total_cost ?? 0)}</div>
            <div className="mt-1">
              <DeltaBadge value={delta?.cost_delta_pct ?? null} higherIsBetter={false} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{stats?.total_sessions ?? 0}</div>
            <div className="mt-1">
              <DeltaBadge value={delta?.sessions_delta_pct ?? null} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Requests</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{stats?.total_requests ?? 0}</div>
            <div className="mt-1">
              <DeltaBadge value={delta?.requests_delta_pct ?? null} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{((stats?.cache_hit_rate ?? 0) * 100).toFixed(1)}%</div>
            <div className="mt-1">
              <DeltaBadge value={delta?.cache_rate_delta_pct ?? null} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 히트맵 */}
      <UsageHeatmap data={daily} agentType="all" />

      {/* 에이전트 요약 + 최근 세션 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 에이전트별 오늘 요약 */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Today by Agent</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {AGENT_ORDER.map((agentId) => {
              const agent = AGENTS[agentId]
              const summary = agentSummaries.find((s) => s.agent_type === agentId)
              return (
                <div
                  key={agentId}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: agent.hex }}
                    />
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  {summary ? (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{formatCost(summary.today_cost)}</span>
                      <span>{summary.today_requests} reqs</span>
                      {summary.last_active && (
                        <span>{formatRelativeTime(summary.last_active)}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No activity today</span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 최근 세션 5개 */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
              <button
                onClick={() => router.push('/sessions')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {sessions.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                No sessions
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => {
                  const agent = AGENTS[s.agent_type as keyof typeof AGENTS]
                  return (
                    <div
                      key={s.session_id}
                      className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/sessions?id=${s.session_id}`)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: agent?.hex ?? '#8b5cf6' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium">{agent?.name ?? s.agent_type}</span>
                            {s.project_name && (
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                · {s.project_name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {s.model || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                        <span className="font-medium">{formatCost(s.cost)}</span>
                        <span className="text-muted-foreground">{formatDuration(s.duration_ms)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
