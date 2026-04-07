import { dataClient } from '@/shared/lib/data-client'
import type { AgentsApiResponse } from '@/app/api/agents/route'

export const agentsService = {
  getLive: (): Promise<AgentsApiResponse> =>
    dataClient.query('agents') as Promise<AgentsApiResponse>,
}
