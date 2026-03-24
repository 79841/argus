import type { IndividualToolRow } from '@/shared/lib/queries'
import type { RegisteredTool, RegisteredAgentType } from '@/shared/lib/registered-tools'

export type ToolStatus = 'active' | 'unused' | 'unregistered'

export type MergedToolItem = {
  name: string
  scope?: 'project' | 'global'
  agentType?: RegisteredAgentType
  projectName?: string
  filePath?: string
  status: ToolStatus
  invocation_count: number
  success_count: number
  fail_count: number
  avg_duration_ms: number
  last_used?: string
  agent_type?: string
}

export type MergedMcpServer = {
  serverName: string
  scope?: 'project' | 'global'
  agentType?: RegisteredAgentType
  projectName?: string
  filePath?: string
  status: ToolStatus
  totalCalls: number
  successCount: number
  failCount: number
  lastUsed?: string
}

export const mergeTools = (
  registered: RegisteredTool[],
  usage: IndividualToolRow[],
  detailType: 'agent' | 'skill',
): MergedToolItem[] => {
  const filteredRegistered = registered.filter((r) => r.type === detailType)
  const filteredUsage = usage.filter((u) => u.detail_type === detailType)

  const usageMap = new Map<string, IndividualToolRow[]>()
  for (const row of filteredUsage) {
    const key = row.detail_name
    if (!usageMap.has(key)) usageMap.set(key, [])
    usageMap.get(key)!.push(row)
  }

  const merged: MergedToolItem[] = []
  const seen = new Set<string>()

  for (const reg of filteredRegistered) {
    seen.add(reg.name)
    const rows = usageMap.get(reg.name)
    if (rows && rows.length > 0) {
      const total = aggregateRows(rows)
      merged.push({
        name: reg.name,
        scope: reg.scope,
        agentType: reg.agentType,
        projectName: reg.projectName,
        filePath: reg.filePath,
        status: 'active',
        ...total,
      })
    } else {
      merged.push({
        name: reg.name,
        scope: reg.scope,
        agentType: reg.agentType,
        projectName: reg.projectName,
        filePath: reg.filePath,
        status: 'unused',
        invocation_count: 0,
        success_count: 0,
        fail_count: 0,
        avg_duration_ms: 0,
      })
    }
  }

  for (const [name, rows] of usageMap) {
    if (seen.has(name)) continue
    const total = aggregateRows(rows)
    merged.push({
      name,
      status: 'unregistered',
      ...total,
    })
  }

  return merged.sort((a, b) => b.invocation_count - a.invocation_count)
}

export const mergeMcpTools = (
  registered: RegisteredTool[],
  usage: IndividualToolRow[],
): MergedMcpServer[] => {
  const filteredRegistered = registered.filter((r) => r.type === 'mcp')
  const filteredUsage = usage.filter((u) => u.detail_type === 'mcp')

  const serverUsageMap = new Map<string, IndividualToolRow[]>()
  for (const row of filteredUsage) {
    const serverName = row.detail_name
    if (!serverUsageMap.has(serverName)) serverUsageMap.set(serverName, [])
    serverUsageMap.get(serverName)!.push(row)
  }

  const merged: MergedMcpServer[] = []
  const seen = new Set<string>()

  for (const reg of filteredRegistered) {
    seen.add(reg.name)
    const rows = serverUsageMap.get(reg.name)
    if (rows && rows.length > 0) {
      const total = aggregateRows(rows)
      merged.push({
        serverName: reg.name,
        scope: reg.scope,
        agentType: reg.agentType,
        projectName: reg.projectName,
        filePath: reg.filePath,
        status: 'active',
        totalCalls: total.invocation_count,
        successCount: total.success_count,
        failCount: total.fail_count,
        lastUsed: total.last_used,
      })
    } else {
      merged.push({
        serverName: reg.name,
        scope: reg.scope,
        agentType: reg.agentType,
        projectName: reg.projectName,
        filePath: reg.filePath,
        status: 'unused',
        totalCalls: 0,
        successCount: 0,
        failCount: 0,
      })
    }
  }

  for (const [serverName, rows] of serverUsageMap) {
    if (seen.has(serverName)) continue
    const total = aggregateRows(rows)
    merged.push({
      serverName,
      status: 'unregistered',
      totalCalls: total.invocation_count,
      successCount: total.success_count,
      failCount: total.fail_count,
      lastUsed: total.last_used,
    })
  }

  return merged.sort((a, b) => b.totalCalls - a.totalCalls)
}

const aggregateRows = (rows: IndividualToolRow[]) => {
  let invocation_count = 0
  let success_count = 0
  let fail_count = 0
  let totalDuration = 0
  let latest = ''

  for (const r of rows) {
    invocation_count += r.invocation_count
    success_count += r.success_count
    fail_count += r.fail_count
    totalDuration += r.avg_duration_ms * r.invocation_count
    if (r.last_used > latest) latest = r.last_used
  }

  return {
    invocation_count,
    success_count,
    fail_count,
    avg_duration_ms: invocation_count > 0 ? totalDuration / invocation_count : 0,
    last_used: latest || undefined,
  }
}
