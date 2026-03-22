'use client'

import { useState, useEffect } from 'react'
import { configService } from '@/shared/services'
import type { ConfigChange } from '@/shared/lib/config-tracker'
import type { ImpactCompareResult, DailyMetricPoint } from '@/shared/lib/queries'
import type { DateRange } from '@/shared/types/common'
import type { CategoryType } from '@/features/usage/types/usage'

const RULES_FILES = [
  'CLAUDE.md', 'codex.md', 'GEMINI.md', 'AGENTS.md',
  '.claude/agents/', '.claude/skills/',
]

const TOOLS_FILES = ['.mcp.json', '.claude/settings.json']

const classifyChange = (filePath: string): 'rules' | 'tools' => {
  if (TOOLS_FILES.some(f => filePath.includes(f))) return 'tools'
  return 'rules'
}

export type EnrichedChange = ConfigChange & {
  category: 'rules' | 'tools'
  impact: ImpactCompareResult | null
}

type UseImpactDataParams = {
  dateRange: DateRange
  category: CategoryType
  compareDays: number
}

type UseImpactDataResult = {
  changes: EnrichedChange[]
  dailyMetrics: DailyMetricPoint[]
  loading: boolean
}

export const useImpactData = ({ dateRange, category, compareDays }: UseImpactDataParams): UseImpactDataResult => {
  const [changes, setChanges] = useState<EnrichedChange[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const fetchAll = async () => {
      try {
        const [configHistory, metrics] = await Promise.all([
          configService.getConfigHistory({ days: 90 }),
          configService.getDailyMetrics({ from: dateRange.from, to: dateRange.to }),
        ])

        setDailyMetrics(metrics)

        const typed = configHistory as ConfigChange[]
        const categorized = typed.map(c => ({
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

        const enriched: EnrichedChange[] = await Promise.all(
          dateFiltered.map(async (c) => {
            try {
              const impact = await configService.getConfigCompare({
                date: c.date,
                days: compareDays,
              })
              return { ...c, impact }
            } catch {
              return { ...c, impact: null }
            }
          })
        )

        setChanges(enriched)
      } catch {
        setChanges([])
        setDailyMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [dateRange, category, compareDays])

  return { changes, dailyMetrics, loading }
}
