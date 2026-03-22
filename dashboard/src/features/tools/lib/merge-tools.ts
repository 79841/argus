import type { IndividualToolRow } from '@/shared/lib/queries'

export type RegisteredTool = {
  name: string
  type: 'agent' | 'skill' | 'mcp' | 'hook'
  scope: 'project' | 'global'
  filePath: string
}

export type ToolStatus = 'active' | 'unused' | 'unregistered'

export type MergedToolItem = {
  name: string
  scope?: 'project' | 'global'
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
  filePath?: string
  status: ToolStatus
  totalCalls: number
  successCount: number
  failCount: number
  tools: MergedToolItem[]
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
        filePath: reg.filePath,
        status: 'active',
        ...total,
      })
    } else {
      merged.push({
        name: reg.name,
        scope: reg.scope,
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
      const tools = buildMcpToolItems(rows)
      const total = aggregateRows(rows)
      merged.push({
        serverName: reg.name,
        scope: reg.scope,
        filePath: reg.filePath,
        status: 'active',
        totalCalls: total.invocation_count,
        successCount: total.success_count,
        failCount: total.fail_count,
        tools,
      })
    } else {
      merged.push({
        serverName: reg.name,
        scope: reg.scope,
        filePath: reg.filePath,
        status: 'unused',
        totalCalls: 0,
        successCount: 0,
        failCount: 0,
        tools: [],
      })
    }
  }

  for (const [serverName, rows] of serverUsageMap) {
    if (seen.has(serverName)) continue
    const tools = buildMcpToolItems(rows)
    const total = aggregateRows(rows)
    merged.push({
      serverName,
      status: 'unregistered',
      totalCalls: total.invocation_count,
      successCount: total.success_count,
      failCount: total.fail_count,
      tools,
    })
  }

  return merged.sort((a, b) => b.totalCalls - a.totalCalls)
}

const aggregateRows = (rows: IndividualToolRow[]) => {
  const invocation_count = rows.reduce((s, r) => s + r.invocation_count, 0)
  const success_count = rows.reduce((s, r) => s + r.success_count, 0)
  const fail_count = rows.reduce((s, r) => s + r.fail_count, 0)
  const avg_duration_ms =
    invocation_count > 0
      ? rows.reduce((s, r) => s + r.avg_duration_ms * r.invocation_count, 0) / invocation_count
      : 0
  const last_used = rows.reduce((latest, r) => (r.last_used > latest ? r.last_used : latest), '')

  return { invocation_count, success_count, fail_count, avg_duration_ms, last_used: last_used || undefined }
}

const buildMcpToolItems = (rows: IndividualToolRow[]): MergedToolItem[] => {
  return rows.map((r) => ({
    name: r.tool_name.replace(/^mcp:/, ''),
    status: 'active' as ToolStatus,
    invocation_count: r.invocation_count,
    success_count: r.success_count,
    fail_count: r.fail_count,
    avg_duration_ms: r.avg_duration_ms,
    last_used: r.last_used,
    agent_type: r.agent_type,
  }))
}
