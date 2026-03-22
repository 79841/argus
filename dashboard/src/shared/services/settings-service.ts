import { dataClient } from '@/shared/lib/data-client'
import type { AgentConnectionStatus } from '@/features/settings/types/settings'

type SetupStatusResponse = {
  agents: AgentConnectionStatus[]
}

export const settingsService = {
  getSetupStatus: (): Promise<SetupStatusResponse> =>
    dataClient.query('setup/status') as Promise<SetupStatusResponse>,

  connectAgents: (body: unknown): Promise<unknown> =>
    dataClient.mutate('setup/connect', body),

  disconnectAgents: (body: unknown): Promise<unknown> =>
    dataClient.mutate('setup/disconnect', body),
}
