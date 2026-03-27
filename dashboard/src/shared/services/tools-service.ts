import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { ToolUsageRow, ToolDetailRow, DailyToolRow, IndividualToolRow, ToolSingleStat, ToolDailyRow, ToolSessionRow } from '@/shared/lib/queries'
import type { RegisteredTool } from '@/shared/lib/registered-tools'

type ToolsResponse = {
  tools?: ToolUsageRow[] | ToolDetailRow[]
  daily?: DailyToolRow[]
  individual?: IndividualToolRow[]
}

type RegisteredToolsResponse = {
  tools?: RegisteredTool[]
}

type ToolDetailResponse = {
  tool?: ToolSingleStat | null
  daily?: ToolDailyRow[]
  sessions?: ToolSessionRow[]
}

export const toolsService = {
  getTools: (params?: QueryParams): Promise<ToolsResponse> =>
    dataClient.query('tools', params) as Promise<ToolsResponse>,

  getRegisteredTools: (): Promise<RegisteredToolsResponse> =>
    dataClient.query('tools/registered') as Promise<RegisteredToolsResponse>,

  getToolDetail: (toolName: string, days: number): Promise<ToolDetailResponse> =>
    dataClient.query(`tools/${encodeURIComponent(toolName)}`, { days }) as Promise<ToolDetailResponse>,
}
