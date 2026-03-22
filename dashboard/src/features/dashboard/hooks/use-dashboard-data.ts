'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAutoRefresh } from '@/shared/hooks/use-auto-refresh'
import { overviewService, dailyService, sessionsService } from '@/shared/services'
import type { OverviewStats, OverviewDelta, AgentTodaySummary, AgentDistribution, DailyStats, SessionRow } from '@/shared/lib/queries'

type DashboardData = {
  stats: OverviewStats | null
  delta: OverviewDelta | null
  agentSummaries: AgentTodaySummary[]
  agentDistribution: AgentDistribution[]
  daily: DailyStats[]
  sessions: SessionRow[]
}

type UseDashboardDataReturn = {
  data: DashboardData
  loading: boolean
}

export const useDashboardData = (): UseDashboardDataReturn => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    delta: null,
    agentSummaries: [],
    agentDistribution: [],
    daily: [],
    sessions: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    overviewService.syncPricing().catch(() => {})
  }, [])

  const fetchData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    Promise.all([
      overviewService.getOverview(),
      dailyService.getDailyStats({ days: 112 }),
      sessionsService.getSessions({ limit: 5 }),
    ])
      .then(([overviewData, dailyData, sessionsData]) => {
        const rawOverview = overviewData as unknown as Record<string, unknown>
        setData({
          stats: overviewData as unknown as OverviewStats,
          delta: (rawOverview.delta as OverviewDelta) ?? null,
          agentSummaries: (rawOverview.agent_summaries as AgentTodaySummary[]) ?? [],
          agentDistribution: (rawOverview.agent_distribution as AgentDistribution[]) ?? [],
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

  return { data, loading }
}
