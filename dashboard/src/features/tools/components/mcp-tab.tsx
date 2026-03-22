'use client'

import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { AGENTS } from '@/shared/lib/agents'
import { cn } from '@/shared/lib/utils'
import type { MergedMcpServer, MergedToolItem } from '@/features/tools/lib/merge-tools'
import { TOP_COLORS, STATUS_BADGE, SCOPE_BADGE, formatToolDate } from './constants'

type McpTabProps = {
  data: MergedMcpServer[]
}

const AGENT_DOT: Record<string, string> = {
  claude: 'bg-orange-500',
  codex: 'bg-emerald-500',
  gemini: 'bg-blue-500',
}

const ToolRows = ({ tools }: { tools: MergedToolItem[] }) => {
  if (tools.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="py-3 text-center text-xs text-muted-foreground">
          사용 기록이 없습니다
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {tools.map((tool, idx) => {
        const agent = tool.agent_type ? AGENTS[tool.agent_type as keyof typeof AGENTS] : null
        const dot = tool.agent_type ? AGENT_DOT[tool.agent_type] ?? 'bg-gray-500' : null
        return (
          <TableRow key={`${tool.name}-${tool.agent_type ?? idx}`} className="bg-muted/30">
            <TableCell className="pl-8 max-w-0">
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {tool.name}
              </span>
            </TableCell>
            <TableCell>
              {agent && dot ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
                  {agent.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-right font-medium text-xs">{tool.invocation_count}</TableCell>
            <TableCell className="text-right text-xs text-green-600 dark:text-green-400">{tool.success_count}</TableCell>
            <TableCell className="text-right text-xs">
              {tool.fail_count > 0 ? (
                <span className="text-red-600 dark:text-red-400">{tool.fail_count}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">
              {tool.last_used ? formatToolDate(tool.last_used) : '—'}
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
}

export const McpTab = ({ data }: McpTabProps) => {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())

  const registeredCount = data.filter((s) => s.status !== 'unregistered').length
  const activeCount = data.filter((s) => s.status === 'active').length
  const utilizationPct = registeredCount > 0 ? Math.round((activeCount / registeredCount) * 100) : 0

  const totalCalls = data.reduce((s, d) => s + d.totalCalls, 0)
  const totalSuccess = data.reduce((s, d) => s + d.successCount, 0)
  const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0

  const donutData = data
    .filter((s) => s.status === 'active' && s.totalCalls > 0)
    .map((s, i) => ({
      name: s.serverName,
      value: s.totalCalls,
      fill: TOP_COLORS[i % TOP_COLORS.length],
    }))

  const toggleServer = (serverName: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev)
      next.has(serverName) ? next.delete(serverName) : next.add(serverName)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="활용률"
          value={`${utilizationPct}%`}
          sub={registeredCount > 0 ? `등록 ${registeredCount}개 중 ${activeCount}개 활용` : '등록된 서버 없음'}
        />
        <KpiCard
          label="성공률"
          value={totalCalls > 0 ? `${successRate.toFixed(1)}%` : '—'}
          sub={totalCalls > 0 ? `전체 ${totalCalls.toLocaleString()}회 호출` : '호출 데이터 없음'}
        />
      </div>

      {donutData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">서버별 호출 비율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as (typeof donutData)[number]
                      const pct = totalCalls > 0 ? ((d.value / totalCalls) * 100).toFixed(1) : '0'
                      return (
                        <div style={CHART_THEME.tooltip.containerStyle}>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {d.value.toLocaleString()}회 ({pct}%)
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
                <span className="text-xl font-bold tabular-nums leading-none">
                  {totalCalls.toLocaleString()}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">total calls</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">MCP 서버 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState
              title="MCP 서버 없음"
              description="등록된 MCP 서버가 없거나 아직 호출 기록이 없습니다."
            />
          ) : (
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[20%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="text-xs text-muted-foreground">
                  <TableHead>Server / Tool</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status / Scope</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Fail</TableHead>
                  <TableHead className="text-right">Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((server) => {
                  const isExpanded = expandedServers.has(server.serverName)
                  const statusCfg = STATUS_BADGE[server.status]
                  const isUnused = server.status === 'unused'

                  return (
                    <React.Fragment key={server.serverName}>
                      <TableRow
                        className={cn(
                          'cursor-pointer hover:bg-muted/50 transition-colors',
                          isUnused && 'opacity-50'
                        )}
                        onClick={() => toggleServer(server.serverName)}
                      >
                        <TableCell className="max-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs select-none">
                              {isExpanded ? '▾' : '▸'}
                            </span>
                            <span className="block truncate font-mono text-xs font-medium">
                              {server.serverName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
                        </TableCell>
                        <TableCell className="space-y-1">
                          <div>
                            <Badge className={cn('text-[10px] px-1.5 py-0', statusCfg.className)}>
                              {statusCfg.label}
                            </Badge>
                          </div>
                          {server.scope && (
                            <div>
                              <Badge className={cn('text-[10px] px-1.5 py-0', SCOPE_BADGE[server.scope].className)}>
                                {SCOPE_BADGE[server.scope].label}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {server.totalCalls > 0 ? server.totalCalls : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {server.successCount > 0 ? server.successCount : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {server.failCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400">{server.failCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">—</TableCell>
                      </TableRow>

                      {isExpanded && (
                        <ToolRows tools={server.tools} />
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
