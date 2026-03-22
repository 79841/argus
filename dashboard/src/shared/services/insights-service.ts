import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { HighCostSession, ModelCostEfficiency } from '@/shared/lib/queries'
import type { Suggestion } from '@/shared/lib/suggestions'

type InsightsResponse = {
  highCostSessions: HighCostSession[]
  modelEfficiency: ModelCostEfficiency[]
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
