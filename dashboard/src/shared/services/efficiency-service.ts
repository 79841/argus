import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { EfficiencyRow, EfficiencyComparisonRow } from '@/shared/lib/queries'

type EfficiencyResponse = {
  data: EfficiencyRow[]
  comparison: {
    current: EfficiencyComparisonRow[]
    previous: EfficiencyComparisonRow[]
  }
}

export const efficiencyService = {
  getEfficiency: (params?: QueryParams): Promise<EfficiencyResponse> =>
    dataClient.query('efficiency', params) as Promise<EfficiencyResponse>,
}
