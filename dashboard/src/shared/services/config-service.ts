import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { ImpactCompareResult, DailyMetricPoint } from '@/shared/lib/queries'
import type { ConfigChange } from '@/shared/lib/config-tracker'
import type { FileEntry } from '@/features/rules/types/rules'

type ConfigFilesResponse = {
  files?: FileEntry[]
}

type ConfigContentResponse = {
  content?: string
}

export const configService = {
  getConfigFiles: (): Promise<ConfigFilesResponse> =>
    dataClient.query('config') as Promise<ConfigFilesResponse>,

  getConfigContent: (params: QueryParams): Promise<ConfigContentResponse> =>
    dataClient.query('config', params) as Promise<ConfigContentResponse>,

  saveConfig: (body: unknown): Promise<unknown> =>
    dataClient.mutate('config', body),

  getConfigHistory: (params?: QueryParams): Promise<ConfigChange[]> =>
    dataClient.query('config-history', params) as Promise<ConfigChange[]>,

  getConfigCompare: (params: QueryParams): Promise<ImpactCompareResult> =>
    dataClient.query('config-history/compare', params) as Promise<ImpactCompareResult>,

  getDailyMetrics: (params: QueryParams): Promise<DailyMetricPoint[]> =>
    dataClient.query('config-history/daily-metrics', params) as Promise<DailyMetricPoint[]>,
}
