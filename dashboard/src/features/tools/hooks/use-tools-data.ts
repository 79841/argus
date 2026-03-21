'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ToolDetailRow, DailyToolRow, IndividualToolRow, ToolUsageRow } from '@/shared/lib/queries'
import { toolsService } from '@/shared/services'
import type { AgentType } from '@/shared/lib/agents'

type ToolsKpi = {
  total_calls: number
  success_rate: number
  avg_duration_ms: number
  unique_tools: number
}

type UseToolsDataReturn = {
  tools: ToolDetailRow[]
  topTools: ToolUsageRow[]
  daily: DailyToolRow[]
  individual: IndividualToolRow[]
  kpi: ToolsKpi | null
  loading: boolean
}

export const useToolsData = (agentType: AgentType, days: string): UseToolsDataReturn => {
  const [tools, setTools] = useState<ToolDetailRow[]>([])
  const [topTools, setTopTools] = useState<ToolUsageRow[]>([])
  const [daily, setDaily] = useState<DailyToolRow[]>([])
  const [individual, setIndividual] = useState<IndividualToolRow[]>([])
  const [kpi, setKpi] = useState<ToolsKpi | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)

    Promise.all([
      toolsService.getTools({ agent_type: agentType, days: Number(days), detail: true }),
      toolsService.getTools({ agent_type: agentType, days: Number(days) }),
    ])
      .then(([detail, simple]) => {
        const d = detail as Record<string, unknown[]>
        const s = simple as Record<string, unknown[]>
        const detailTools: ToolDetailRow[] = (d.tools ?? []) as ToolDetailRow[]
        const dailyData: DailyToolRow[] = (d.daily ?? []) as DailyToolRow[]
        const individualData: IndividualToolRow[] = (d.individual ?? []) as IndividualToolRow[]
        const simpleTools: ToolUsageRow[] = (s.tools ?? []) as ToolUsageRow[]

        setTools(detailTools)
        setDaily(dailyData)
        setIndividual(individualData)
        setTopTools(simpleTools)

        const totalCalls = simpleTools.reduce((sum, r) => sum + r.invocation_count, 0)
        const totalSuccess = simpleTools.reduce((sum, r) => sum + r.success_count, 0)
        const avgDuration =
          simpleTools.length > 0
            ? simpleTools.reduce((sum, r) => sum + r.avg_duration_ms * r.invocation_count, 0) /
              Math.max(totalCalls, 1)
            : 0

        setKpi({
          total_calls: totalCalls,
          success_rate: totalCalls > 0 ? totalSuccess / totalCalls : 0,
          avg_duration_ms: avgDuration,
          unique_tools: simpleTools.length,
        })
        setLoading(false)
      })
      .catch(() => {
        setTools([])
        setDaily([])
        setIndividual([])
        setTopTools([])
        setKpi(null)
        setLoading(false)
      })
  }, [agentType, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { tools, topTools, daily, individual, kpi, loading }
}
