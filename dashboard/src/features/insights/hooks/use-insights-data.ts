'use client'

import { useState, useEffect, useCallback } from 'react'
import { insightsService } from '@/shared/services'
import type { HighCostSession, ModelCostEfficiency, BudgetStatus } from '@/lib/queries'
import type { Suggestion } from '@/lib/suggestions'

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

  const fetchData = useCallback(() => {
    setLoading(true)
    insightsService.getInsights({ days: Number(days) })
      .then((res) => {
        setData(res as InsightsData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [days])

  const fetchSuggestions = useCallback(() => {
    setSuggestionsLoading(true)
    insightsService.getSuggestions({ days: Number(days) })
      .then((res) => {
        setSuggestions(res.suggestions ?? [])
        setSuggestionsLoading(false)
      })
      .catch(() => setSuggestionsLoading(false))
  }, [days])

  useEffect(() => {
    fetchData()
    fetchSuggestions()
  }, [fetchData, fetchSuggestions])

  return { data, suggestions, loading, suggestionsLoading }
}
