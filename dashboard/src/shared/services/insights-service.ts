import { dataClient } from '@/lib/data-client'
import type { QueryParams } from '@/types/electron'
import type { HighCostSession, ModelCostEfficiency, BudgetStatus } from '@/lib/queries'
import type { Suggestion } from '@/lib/suggestions'

type InsightsResponse = {
  highCostSessions: HighCostSession[]
  modelEfficiency: ModelCostEfficiency[]
  budgetStatus: BudgetStatus[]
}

type SuggestionsResponse = {
  suggestions: Suggestion[]
}

export const insightsService = {
  getInsights: (params?: QueryParams): Promise<InsightsResponse> =>
    dataClient.query('insights', params) as Promise<InsightsResponse>,

  getSuggestions: (params?: QueryParams): Promise<SuggestionsResponse> =>
    dataClient.query('suggestions', params) as Promise<SuggestionsResponse>,
}
