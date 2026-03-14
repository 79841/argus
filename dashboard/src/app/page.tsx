'use client'

import { useState, useEffect } from 'react'
import type { OverviewStats, ModelUsage, DailyStats, ToolUsageRow } from '@/lib/queries'
import { StatsCard } from '@/components/stats-card'
import { ModelPieChart } from '@/components/model-pie-chart'
import { CostChart } from '@/components/cost-chart'
import type { ConfigChangeMarker } from '@/components/cost-chart'
import { TokenChart } from '@/components/token-chart'
import type { ConfigChange } from '@/lib/config-tracker'
import { ToolUsageChart } from '@/components/tool-usage-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IngestStatus } from '@/components/ingest-status'
import { useTopBar } from '@/components/top-bar-context'

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatCost = (value: number): string => `$${value.toFixed(2)}`

export default function OverviewPage() {
  const { agentType, project, dateRange } = useTopBar()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [models, setModels] = useState<ModelUsage[]>([])
  const [daily, setDaily] = useState<DailyStats[]>([])
  const [tools, setTools] = useState<ToolUsageRow[]>([])
  const [configChanges, setConfigChanges] = useState<ConfigChangeMarker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pricing-sync', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&from=${dateRange.from}&to=${dateRange.to}`
    Promise.all([
      fetch(`/api/overview?${q}`).then((r) => r.json()),
      fetch(`/api/models?${q}`).then((r) => r.json()),
      fetch(`/api/daily?${q}`).then((r) => r.json()),
      fetch(`/api/config-history?days=30`).then((r) => r.json()),
      fetch(`/api/tools?${q}`).then((r) => r.json()),
    ])
      .then(([statsData, modelsData, dailyData, configData, toolsData]) => {
        setStats(statsData as OverviewStats)
        setModels(modelsData as ModelUsage[])
        setDaily(dailyData as DailyStats[])
        setTools((toolsData as { tools: ToolUsageRow[] }).tools ?? [])
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
        setStats(null)
        setModels([])
        setDaily([])
        setTools([])
        setConfigChanges([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <IngestStatus />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Sessions"
              value={stats?.total_sessions ?? 0}
              description="Total sessions in range"
            />
            <StatsCard
              title="Total Cost"
              value={formatCost(stats?.total_cost ?? 0)}
              description="Estimated cost in range"
              tooltip={[
                'Claude: API에서 cost_usd 직접 제공',
                'Codex/Gemini: LiteLLM 가격 DB 기반 계산',
                '  (input + output + cache + reasoning) x 단가',
              ].join('\n')}
            />
            <StatsCard
              title="Input Tokens"
              value={formatTokens(stats?.total_input_tokens ?? 0)}
              description="Total input tokens in range"
            />
            <StatsCard
              title="Output Tokens"
              value={formatTokens(stats?.total_output_tokens ?? 0)}
              description="Total output tokens in range"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CostChart data={daily} agentType={agentType} configChanges={configChanges} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelPieChart data={models} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TokenChart data={daily} agentType={agentType} configChanges={configChanges} />
            <ToolUsageChart data={tools} />
          </div>
        </>
      )}
    </div>
  )
}
