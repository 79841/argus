'use client'

import { useState, useEffect } from 'react'
import type { ToolDetailRow, DailyToolRow, IndividualToolRow } from '@/lib/queries'
import { ToolDetailTable } from '@/components/tool-detail-table'
import { DailyToolChart } from '@/components/daily-tool-chart'
import { IndividualToolTable } from '@/components/individual-tool-table'
import { RegisteredToolsCard } from '@/components/registered-tools-card'
import { useTopBar } from '@/components/top-bar-context'

export default function ToolsPage() {
  const { agentType, project, dateRange } = useTopBar()
  const [tools, setTools] = useState<ToolDetailRow[]>([])
  const [daily, setDaily] = useState<DailyToolRow[]>([])
  const [individual, setIndividual] = useState<IndividualToolRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&detail=true&from=${dateRange.from}&to=${dateRange.to}`
    fetch(`/api/tools?${q}`)
      .then((r) => r.json())
      .then((data) => {
        setTools(data.tools ?? [])
        setDaily(data.daily ?? [])
        setIndividual(data.individual ?? [])
        setLoading(false)
      })
      .catch(() => {
        setTools([])
        setDaily([])
        setIndividual([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground text-sm mt-1">
            스킬, MCP, 에이전트 등 도구별 호출 횟수와 토큰 사용량
          </p>
        </div>
      </div>

      <RegisteredToolsCard />

      {loading ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          Loading...
        </div>
      ) : tools.length === 0 ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          No tool usage data
        </div>
      ) : (
        <div className="space-y-6">
          <DailyToolChart data={daily} />
          <IndividualToolTable data={individual} />
          <ToolDetailTable data={tools} />
        </div>
      )}
    </div>
  )
}
