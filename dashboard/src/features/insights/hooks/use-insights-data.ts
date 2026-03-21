'use client'

import { useState, useEffect } from 'react'
import { insightsService } from '@/shared/services'
import type { HighCostSession, ModelCostEfficiency, BudgetStatus } from '@/shared/lib/queries'
import type { Suggestion } from '@/shared/lib/suggestions'

type InsightsData = {
  highCostSessions: HighCostSession[]
  modelEfficiency: ModelCostEfficiency[]
  budgetStatus: BudgetStatus[]
}

type UseInsightsDataReturn = {
  data: InsightsData | null
  suggestions: Suggestion[]
  loading: boolean
  suggestionsLoading: boolean
}

export const useInsightsData = (days: string): UseInsightsDataReturn => {
  const [data, setData] = useState<InsightsData | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSuggestionsLoading(true)

    Promise.all([
      insightsService.getInsights({ days: Number(days) }),
      insightsService.getSuggestions({ days: Number(days) }),
    ]).then(([insightsRes, suggestionsRes]) => {
      setData(insightsRes as InsightsData)
      setSuggestions(suggestionsRes.suggestions ?? [])
    }).catch(() => {
      // ignore
    }).finally(() => {
      setLoading(false)
      setSuggestionsLoading(false)
    })
  }, [days])

  return { data, suggestions, loading, suggestionsLoading }
}
