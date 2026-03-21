import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'

type ToolsResponse = {
  tools?: unknown[]
  daily?: unknown[]
  individual?: unknown[]
}

type RegisteredToolsResponse = {
  tools?: unknown[]
}

export const toolsService = {
  getTools: (params?: QueryParams): Promise<ToolsResponse> =>
    dataClient.query('tools', params) as Promise<ToolsResponse>,

  getRegisteredTools: (): Promise<RegisteredToolsResponse> =>
    dataClient.query('tools/registered') as Promise<RegisteredToolsResponse>,
}
