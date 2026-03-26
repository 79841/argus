import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { HeartbeatPoint } from '@/shared/lib/queries'

type HeartbeatResponse = {
  data: HeartbeatPoint[]
  minutes: number
  agent_type: string
}

export const heartbeatService = {
  getHeartbeat: (params?: QueryParams): Promise<HeartbeatResponse> =>
    dataClient.query('heartbeat', params) as Promise<HeartbeatResponse>,
}
