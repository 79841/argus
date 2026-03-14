'use client'

import { useState, useEffect } from 'react'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { CostChart } from '@/components/cost-chart'
import type { ConfigChangeMarker } from '@/components/cost-chart'
import { TokenChart } from '@/components/token-chart'
import type { AgentType } from '@/lib/agents'
import type { DailyStats } from '@/lib/queries'
import type { ConfigChange } from '@/lib/config-tracker'

export default function DailyPage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [data, setData] = useState<DailyStats[]>([])
  const [configChanges, setConfigChanges] = useState<ConfigChangeMarker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/daily?agent_type=${agentType}&project=${project}&days=30`).then((r) => r.json()),
      fetch('/api/config-history?days=30').then((r) => r.json()),
    ])
      .then(([dailyData, configData]) => {
        setData(dailyData as DailyStats[])
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
        setData([])
        setConfigChanges([])
        setLoading(false)
      })
  }, [agentType, project])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Trends</h1>
        <div className="flex items-center gap-3">
          <ProjectFilter value={project} onChange={setProject} />
          <AgentFilter value={agentType} onChange={setAgentType} />
        </div>
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CostChart data={data} agentType={agentType} configChanges={configChanges} />
          <TokenChart data={data} agentType={agentType} configChanges={configChanges} />
        </div>
      )}
    </div>
  )
}
