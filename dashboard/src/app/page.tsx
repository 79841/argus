'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { dataClient } from '@/lib/data-client'
import type { OverviewStats, OverviewDelta, AgentTodaySummary, DailyStats, SessionRow } from '@/lib/queries'
import { AGENTS } from '@/lib/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/ui/kpi-card'
import { AgentDot } from '@/components/ui/agent-dot'
import { EmptyState } from '@/components/ui/empty-state'
import { UsageHeatmap } from '@/components/usage-heatmap'
import { FilterBar } from '@/components/filter-bar'
import { formatCost } from '@/lib/format'

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
    dataClient.mutate('pricing-sync').catch(() => {})
  }, [])

  const fetchData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    Promise.all([
      dataClient.query('overview'),
      dataClient.query('daily', { days: 112 }),
      dataClient.query('sessions', { limit: 5 }),
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
      <div className="flex h-full flex-col">
        <FilterBar><span className="text-sm font-semibold">Dashboard</span></FilterBar>
        <div className="flex-1 overflow-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">Dashboard</span></FilterBar>
      <div className="flex-1 overflow-auto px-4 py-4">
      <div className="flex flex-col gap-4">
      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Today Cost"
          value={formatCost(stats?.total_cost ?? 0)}
          delta={delta?.cost_delta_pct ?? null}
          deltaInverted
        />
        <KpiCard
          label="Sessions"
          value={String(stats?.total_sessions ?? 0)}
          delta={delta?.sessions_delta_pct ?? null}
        />
        <KpiCard
          label="Requests"
          value={String(stats?.total_requests ?? 0)}
          delta={delta?.requests_delta_pct ?? null}
        />
        <KpiCard
          label="Cache Hit Rate"
          value={`${((stats?.cache_hit_rate ?? 0) * 100).toFixed(1)}%`}
          delta={delta?.cache_rate_delta_pct ?? null}
        />
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
                    <AgentDot agent={agentId} size="md" />
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
              <EmptyState title="No sessions" />
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
                        <AgentDot agent={s.agent_type as keyof typeof AGENTS} size="xs" />
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
      </div>
    </div>
  )
}
