'use client'

import { useState, useEffect } from 'react'
import { efficiencyService } from '@/shared/services'
import { calculateEfficiency } from '@/features/usage/lib/efficiency'
import { computeCacheRate } from '@/shared/lib/format'
import type { DateRange } from '@/shared/types/common'
import type { EfficiencyRow, EfficiencyComparisonRow } from '@/shared/lib/queries'
import type { EfficiencyAgentRow, EfficiencyTrendPoint } from '@/features/usage/types/usage'

type UseEfficiencyDataParams = {
  project: string
  dateRange: DateRange
}

type UseEfficiencyDataResult = {
  agentRows: EfficiencyAgentRow[]
  trend: EfficiencyTrendPoint[]
  overall: { cacheRate: number; avgDuration: number; score: number } | null
}

export const useEfficiencyData = ({ project, dateRange }: UseEfficiencyDataParams): UseEfficiencyDataResult => {
  const [agentRows, setAgentRows] = useState<EfficiencyAgentRow[]>([])
  const [trend, setTrend] = useState<EfficiencyTrendPoint[]>([])
  const [overall, setOverall] = useState<{ cacheRate: number; avgDuration: number; score: number } | null>(null)

  useEffect(() => {
    efficiencyService.getEfficiency({ project, from: dateRange.from, to: dateRange.to })
      .then((res) => {
        const { data, comparison } = res as {
          data: EfficiencyRow[]
          comparison: { current: EfficiencyComparisonRow[]; previous: EfficiencyComparisonRow[] }
        }

        const trendMap: Record<string, EfficiencyTrendPoint> = {}
        for (const row of data) {
          if (!trendMap[row.date]) trendMap[row.date] = { date: row.date }
          const eff = calculateEfficiency({
            cacheReadTokens: row.total_cache_read,
            inputTokens: row.total_input,
            outputTokens: row.total_output,
            requestCount: row.total_requests,
            costUsd: row.cost,
            totalDurationMs: row.total_duration_ms,
          })
          trendMap[row.date][row.agent_type] = eff.score
        }

        const filled: EfficiencyTrendPoint[] = []
        const cur = new Date(dateRange.from)
        const end = new Date(dateRange.to)
        while (cur <= end) {
          const key = cur.toISOString().slice(0, 10)
          filled.push(trendMap[key] ?? { date: key })
          cur.setDate(cur.getDate() + 1)
        }
        setTrend(filled)

        const rows = comparison.current.map(cur => {
          const eff = calculateEfficiency({
            cacheReadTokens: cur.total_cache_read,
            inputTokens: cur.total_input,
            outputTokens: cur.total_output,
            requestCount: cur.total_requests,
            costUsd: cur.cost,
            totalDurationMs: cur.total_duration_ms,
          })
          const cacheRate = computeCacheRate(cur.total_input, cur.total_cache_read)
          return {
            agent_type: cur.agent_type,
            cache_rate: cacheRate,
            token_efficiency: eff.tokenEfficiency,
            avg_duration_s: eff.avgDurationMs / 1000,
            score: eff.score,
          }
        })
        setAgentRows(rows)

        const allCur = comparison.current
        const totalCacheRead = allCur.reduce((s, r) => s + r.total_cache_read, 0)
        const totalInput = allCur.reduce((s, r) => s + r.total_input, 0)
        const totalRequests = allCur.reduce((s, r) => s + r.total_requests, 0)
        const totalDuration = allCur.reduce((s, r) => s + r.total_duration_ms, 0)
        const totalCost = allCur.reduce((s, r) => s + r.cost, 0)
        const totalOutput = allCur.reduce((s, r) => s + r.total_output, 0)
        const effAll = calculateEfficiency({
          cacheReadTokens: totalCacheRead,
          inputTokens: totalInput,
          outputTokens: totalOutput,
          requestCount: totalRequests,
          costUsd: totalCost,
          totalDurationMs: totalDuration,
        })
        setOverall({
          cacheRate: computeCacheRate(totalInput, totalCacheRead),
          avgDuration: effAll.avgDurationMs / 1000,
          score: effAll.score,
        })
      })
      .catch(() => {})
  }, [project, dateRange])

  return { agentRows, trend, overall }
}
