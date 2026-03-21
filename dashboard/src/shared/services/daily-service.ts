import { dataClient } from '@/lib/data-client'
import type { QueryParams } from '@/types/electron'
import type { DailyStats } from '@/lib/queries'

export const dailyService = {
  getDailyStats: (params?: QueryParams): Promise<DailyStats[]> =>
    dataClient.query('daily', params) as Promise<DailyStats[]>,
}
