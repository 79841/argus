'use client'

import { useState, useEffect } from 'react'
import type { AgentType } from '@/lib/agents'
import type { OverviewStats, ModelUsage, DailyStats, ToolUsageRow } from '@/lib/queries'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { StatsCard } from '@/components/stats-card'
import { ModelPieChart } from '@/components/model-pie-chart'
import { CostChart } from '@/components/cost-chart'
import type { ConfigChangeMarker } from '@/components/cost-chart'
import { TokenChart } from '@/components/token-chart'
import type { ConfigChange } from '@/lib/config-tracker'
import { ToolUsageChart } from '@/components/tool-usage-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IngestStatus } from '@/components/ingest-status'

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatCost = (value: number): string => `$${value.toFixed(2)}`

export default function OverviewPage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [models, setModels] = useState<ModelUsage[]>([])
  const [daily, setDaily] = useState<DailyStats[]>([])
  const [tools, setTools] = useState<ToolUsageRow[]>([])
  const [configChanges, setConfigChanges] = useState<ConfigChangeMarker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&project=${project}`
    Promise.all([
      fetch(`/api/overview?${q}`).then((r) => r.json()),
      fetch(`/api/models?${q}`).then((r) => r.json()),
      fetch(`/api/daily?${q}&days=7`).then((r) => r.json()),
      fetch('/api/config-history?days=7').then((r) => r.json()),
      fetch(`/api/tools?${q}&days=7`).then((r) => r.json()),
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
  }, [agentType, project])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <IngestStatus />
        </div>
        <div className="flex items-center gap-3">
          <ProjectFilter value={project} onChange={setProject} />
          <AgentFilter value={agentType} onChange={setAgentType} />
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
              title="Today Sessions"
              value={stats?.total_sessions ?? 0}
              description="Total sessions today"
            />
            <StatsCard
              title="Total Cost"
              value={formatCost(stats?.total_cost ?? 0)}
              description="Estimated cost today"
            />
            <StatsCard
              title="Input Tokens"
              value={formatTokens(stats?.total_input_tokens ?? 0)}
              description="Total input tokens today"
            />
            <StatsCard
              title="Output Tokens"
              value={formatTokens(stats?.total_output_tokens ?? 0)}
              description="Total output tokens today"
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
