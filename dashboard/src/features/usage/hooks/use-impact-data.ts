'use client'

import { useState, useEffect } from 'react'
import { configService } from '@/shared/services'
import type { ConfigChange } from '@/shared/lib/config-tracker'
import type { ImpactCompareResult, DailyMetricPoint } from '@/shared/lib/queries'
import type { DateRange } from '@/shared/types/common'
import type { CategoryType } from '@/features/usage/types/usage'
import type { AgentType } from '@/shared/lib/agents'

const classifyChange = (filePath: string): 'rules' | 'tools' => {
  const p = filePath.replace(/\\/g, '/')
  if (p === '.mcp.json' || p.startsWith('.claude/') || p.startsWith('.codex/') || p.startsWith('.gemini/')) return 'tools'
  return 'rules'
}

export type EnrichedChange = ConfigChange & {
  category: 'rules' | 'tools'
  impact: ImpactCompareResult | null
}

type UseImpactDataParams = {
  agentType: AgentType
  project: string
  dateRange: DateRange
  category: CategoryType
  compareDays: number
}

type UseImpactDataResult = {
  changes: EnrichedChange[]
  dailyMetrics: DailyMetricPoint[]
  loading: boolean
}

export const useImpactData = ({ agentType, project, dateRange, category, compareDays }: UseImpactDataParams): UseImpactDataResult => {
  const [changes, setChanges] = useState<EnrichedChange[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const fetchAll = async () => {
      try {
        const [configHistory, metrics] = await Promise.all([
          configService.getConfigHistory({ days: 90 }),
          configService.getDailyMetrics({ from: dateRange.from, to: dateRange.to, agent_type: agentType, project }),
        ])

        setDailyMetrics(metrics)

        const agentFiltered = agentType === 'all'
          ? configHistory
          : configHistory.filter(c => c.agent_type === agentType)

        const categorized = agentFiltered.map(c => ({
          ...c,
          category: classifyChange(c.file_path),
        }))

        const filtered = category === 'all'
          ? categorized
          : categorized.filter(c => c.category === category)

        const dateFiltered = filtered.filter(c => {
          const d = c.date.slice(0, 10)
          return d >= dateRange.from && d <= dateRange.to
        })

        if (dateFiltered.length === 0) {
          setChanges([])
          return
        }

        const dates = dateFiltered.map(c => c.date)
        const impacts = await configService.getConfigCompareBatch(dates, compareDays, agentType, project)

        const enriched: EnrichedChange[] = dateFiltered.map((c, i) => ({
          ...c,
          impact: impacts[i] ?? null,
        }))

        setChanges(enriched)
      } catch {
        setChanges([])
        setDailyMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [agentType, project, dateRange, category, compareDays])

  return { changes, dailyMetrics, loading }
}
