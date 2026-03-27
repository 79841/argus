import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { OverviewStats, OverviewDelta, AgentTodaySummary, AgentDistribution, IngestStatusRow, AgentDailyCost } from '@/shared/lib/queries'

type IngestStatusResponse = {
  agents?: IngestStatusRow[]
}

export type OverviewResponse = OverviewStats & {
  all_time_cost?: number
  all_time_tokens?: number
  delta?: OverviewDelta
  agent_summaries?: AgentTodaySummary[]
  agent_distribution?: AgentDistribution[]
}

type DailyCostsResponse = {
  costs?: AgentDailyCost[]
}

type PricingSyncResponse = {
  synced?: number
  error?: string
  lastSyncedAt?: string
}

type PricingLastSyncResponse = {
  lastSyncedAt: string | null
}

export const overviewService = {
  getOverview: (params?: QueryParams): Promise<OverviewResponse> =>
    dataClient.query('overview', params) as Promise<OverviewResponse>,

  getIngestStatus: (): Promise<IngestStatusResponse> =>
    dataClient.query('ingest-status') as Promise<IngestStatusResponse>,

  getDailyCosts: (): Promise<DailyCostsResponse> =>
    dataClient.query('daily-costs') as Promise<DailyCostsResponse>,

  syncPricing: (): Promise<PricingSyncResponse> =>
    dataClient.mutate('pricing-sync') as Promise<PricingSyncResponse>,

  getPricingLastSync: (): Promise<PricingLastSyncResponse> =>
    dataClient.query('pricing-sync') as Promise<PricingLastSyncResponse>,
}
