'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAutoRefresh } from '@/shared/hooks/use-auto-refresh'
import { overviewService, dailyService, sessionsService } from '@/shared/services'
import type { OverviewStats, OverviewDelta, AgentTodaySummary, AgentDistribution, DailyStats, SessionRow } from '@/shared/lib/queries'
import type { OverviewResponse } from '@/shared/services/overview-service'

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
      .then(([overviewData, dailyData, sessionsData]: [OverviewResponse, unknown, unknown]) => {
        setData({
          stats: overviewData,
          delta: overviewData.delta ?? null,
          agentSummaries: overviewData.agent_summaries ?? [],
          agentDistribution: overviewData.agent_distribution ?? [],
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
