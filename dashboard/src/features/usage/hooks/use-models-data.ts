'use client'

import { useState, useEffect } from 'react'
import { modelsService } from '@/shared/services'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/types/common'
import type { ModelUsage } from '@/shared/lib/queries'
import type { ModelTableRow } from '@/features/usage/types/usage'

type UseModelsDataParams = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type UseModelsDataResult = {
  models: ModelTableRow[]
}

export const useModelsData = ({ agentType, project, dateRange }: UseModelsDataParams): UseModelsDataResult => {
  const [models, setModels] = useState<ModelTableRow[]>([])

  useEffect(() => {
    modelsService.getModels({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((rows) => {
        const typedRows = rows as ModelUsage[]
        setModels(
          typedRows.map(r => ({
            model: r.model,
            agent_type: r.agent_type,
            request_count: r.request_count,
            cost: r.cost,
            avg_cost: r.request_count > 0 ? r.cost / r.request_count : 0,
          }))
        )
      })
      .catch(() => {})
  }, [agentType, project, dateRange])

  return { models }
}
