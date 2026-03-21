import { dataClient } from '@/lib/data-client'
import type { QueryParams } from '@/types/electron'
import type { ConfigCompareResult } from '@/lib/queries'
import type { ConfigChange } from '@/lib/config-tracker'
import type { FileEntry } from '@/types/rules'

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

  getConfigCompare: (params: QueryParams): Promise<ConfigCompareResult> =>
    dataClient.query('config-history/compare', params) as Promise<ConfigCompareResult>,
}
