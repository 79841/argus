'use client'

import type { IndividualToolRow } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type IndividualToolTableProps = {
  data: IndividualToolRow[]
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'agent': { label: 'Agent', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900' },
  'skill': { label: 'Skill', color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-100 dark:bg-pink-900' },
  'mcp': { label: 'MCP', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900' },
}

const AGENT_STYLE: Record<string, { label: string; color: string }> = {
  'claude': { label: 'Claude', color: 'bg-orange-500' },
  'codex': { label: 'Codex', color: 'bg-emerald-500' },
  'gemini': { label: 'Gemini', color: 'bg-blue-500' },
}

const formatDuration = (ms: number): string => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMcpName = (name: string): string => {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__')
    if (parts.length >= 3) return parts.slice(2).join('/')
  }
  return name
}

const getGroupLabel = (group: string): string => {
  if (group === 'Agent') return 'Agents'
  if (group === 'Skill') return 'Skills'
  if (group === 'MCP') return 'MCP'
  return group
}

export const IndividualToolTable = ({ data }: IndividualToolTableProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Orchestration Tools</CardTitle>
          <CardDescription>
            에이전트, 스킬, MCP 도구의 호출 통계
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground space-y-4">
            <p className="font-medium text-center">아직 데이터가 없습니다</p>

            <div>
              <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Claude Code
              </p>
              <p className="mb-1">
                글로벌 설정(<code className="text-xs bg-muted px-1 py-0.5 rounded">~/.claude/settings.json</code>)에
                다음을 추가하면 에이전트/스킬/MCP 호출이 자동 추적됩니다.
              </p>
              <pre className="text-left text-xs bg-muted rounded-md p-3 overflow-x-auto">{`"env": {
  "OTEL_LOG_TOOL_DETAILS": "1"
}`}</pre>
            </div>

            <div>
              <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Codex
                <span className="ml-1 h-2 w-2 rounded-full bg-blue-500" />
                Gemini CLI
              </p>
              <p>
                MCP 도구 호출은 OTel 텔레메트리에서 자동으로 추출됩니다.
                별도의 설정이 필요하지 않습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by category: Agent, Skill, MCP (all mcp:* merged into one group)
  const grouped: Record<string, IndividualToolRow[]> = {}
  for (const row of data) {
    const group = row.tool_name.startsWith('mcp:') ? 'MCP' : row.tool_name
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(row)
  }

  const groupOrder = ['Agent', 'Skill', 'MCP']
  const sortedKeys = [
    ...groupOrder.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !groupOrder.includes(k)),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Orchestration Tools</CardTitle>
        <CardDescription>
          에이전트, 스킬, MCP 도구의 호출 통계
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedKeys.map((group) => {
          const rows = grouped[group]
          return (
            <div key={group}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {getGroupLabel(group)}
                <span className="ml-2 text-foreground">{rows.length}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Agent</th>
                      <th className="pb-2 pr-4 font-medium">Category</th>
                      <th className="pb-2 pr-4 font-medium text-right">Calls</th>
                      <th className="pb-2 pr-4 font-medium text-right">Success</th>
                      <th className="pb-2 pr-4 font-medium text-right">Fail</th>
                      <th className="pb-2 font-medium text-right">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const category = CATEGORY_CONFIG[row.detail_type] ?? { label: row.detail_type, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900' }
                      const agent = AGENT_STYLE[row.agent_type] ?? { label: row.agent_type, color: 'bg-gray-500' }
                      const displayName = formatMcpName(row.detail_name)
                      return (
                        <tr key={`${row.tool_name}-${row.detail_name}-${row.agent_type}`} className="border-b border-[var(--border-subtle)] last:border-0">
                          <td className="py-2.5 pr-4 max-w-0">
                            <Tooltip>
                              <TooltipTrigger className="block w-full truncate text-left font-mono text-xs font-medium">
                                {displayName}
                              </TooltipTrigger>
                              <TooltipContent>{displayName}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                              <span className={cn('h-2 w-2 shrink-0 rounded-full', agent.color)} />
                              {agent.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge className={cn('text-[10px] px-1.5 py-0 whitespace-nowrap', category.color, category.bg)}>
                              {category.label}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-right font-medium">
                            {row.invocation_count}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-green-600 dark:text-green-400">
                            {row.success_count}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {row.fail_count > 0 ? (
                              <span className="text-red-600 dark:text-red-400">{row.fail_count}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(row.last_used)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
