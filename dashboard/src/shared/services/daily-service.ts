import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { DailyStats } from '@/shared/lib/queries'

export const dailyService = {
  getDailyStats: (params?: QueryParams): Promise<DailyStats[]> =>
    dataClient.query('daily', params) as Promise<DailyStats[]>,
}
