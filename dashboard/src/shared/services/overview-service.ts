import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { OverviewStats } from '@/shared/lib/queries'

type IngestStatusResponse = {
  agents?: unknown[]
}

type AllTimeTotalsResponse = {
  all_time_cost?: number
  all_time_tokens?: number
}

type DailyCostsResponse = {
  costs?: unknown[]
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
  getOverview: (params?: QueryParams): Promise<OverviewStats & AllTimeTotalsResponse> =>
    dataClient.query('overview', params) as Promise<OverviewStats & AllTimeTotalsResponse>,

  getIngestStatus: (): Promise<IngestStatusResponse> =>
    dataClient.query('ingest-status') as Promise<IngestStatusResponse>,

  getDailyCosts: (): Promise<DailyCostsResponse> =>
    dataClient.query('daily-costs') as Promise<DailyCostsResponse>,

  syncPricing: (): Promise<PricingSyncResponse> =>
    dataClient.mutate('pricing-sync') as Promise<PricingSyncResponse>,

  getPricingLastSync: (): Promise<PricingLastSyncResponse> =>
    dataClient.query('pricing-sync') as Promise<PricingLastSyncResponse>,
}
