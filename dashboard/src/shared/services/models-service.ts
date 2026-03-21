import { dataClient } from '@/lib/data-client'
import type { QueryParams } from '@/types/electron'
import type { ModelUsage } from '@/lib/queries'

export const modelsService = {
  getModels: (params?: QueryParams): Promise<ModelUsage[]> =>
    dataClient.query('models', params) as Promise<ModelUsage[]>,
}
