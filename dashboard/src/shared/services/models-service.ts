import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { ModelUsage } from '@/shared/lib/queries'

export const modelsService = {
  getModels: (params?: QueryParams): Promise<ModelUsage[]> =>
    dataClient.query('models', params) as Promise<ModelUsage[]>,
}
