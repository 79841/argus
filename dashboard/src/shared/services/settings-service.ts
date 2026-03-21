import { dataClient } from '@/shared/lib/data-client'
import type { AgentConnectionStatus } from '@/features/settings/types/settings'

type LimitsResponse = {
  limits?: {
    agent_type: string
    daily_cost_limit: number
    monthly_cost_limit: number
  }[]
}

type SetupStatusResponse = {
  agents: AgentConnectionStatus[]
}

export const settingsService = {
  getLimits: (): Promise<LimitsResponse> =>
    dataClient.query('settings/limits') as Promise<LimitsResponse>,

  saveLimits: (body: unknown): Promise<unknown> =>
    dataClient.mutate('settings/limits', body),

  getSetupStatus: (): Promise<SetupStatusResponse> =>
    dataClient.query('setup/status') as Promise<SetupStatusResponse>,

  connectAgents: (body: unknown): Promise<unknown> =>
    dataClient.mutate('setup/connect', body),

  disconnectAgents: (body: unknown): Promise<unknown> =>
    dataClient.mutate('setup/disconnect', body),
}
