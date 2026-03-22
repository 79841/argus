'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { UsageHeatmap } from '@/features/dashboard/components/usage-heatmap'
import { FilterBar } from '@/shared/components/filter-bar'
import { formatCost } from '@/shared/lib/format'
import { useDashboardData, AgentSummaryCard, AgentDonutChart, RecentSessionsCard } from '@/features/dashboard'
import { STORAGE_KEYS } from '@/shared/lib/constants'

export default function DashboardPage() {
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const { data, loading } = useDashboardData()
  const { stats, delta, agentSummaries, agentDistribution, daily, sessions } = data

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
    if (completed === 'true') {
      setOnboardingChecked(true)
      return
    }
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((d) => {
        if (!d.hasData) {
          router.replace('/onboarding')
        } else {
          setOnboardingChecked(true)
        }
      })
      .catch(() => setOnboardingChecked(true))
  }, [router])

  if (!onboardingChecked) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <FilterBar><span className="text-sm font-semibold">Dashboard</span></FilterBar>
        <div className="flex-1 overflow-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
              ))}
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
          <div className="grid grid-cols-4 gap-4">
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

          {/* 에이전트 분포 + 에이전트 요약 + 최근 세션 */}
          <div className="grid grid-cols-3 gap-4">
            <AgentDonutChart data={agentDistribution} />
            <AgentSummaryCard agentSummaries={agentSummaries} />
            <RecentSessionsCard
              sessions={sessions}
              onViewAll={() => router.push('/sessions')}
              onSelectSession={(id) => router.push(`/sessions?id=${id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
