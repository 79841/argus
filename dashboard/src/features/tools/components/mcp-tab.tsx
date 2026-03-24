'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/components/ui/table'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import type { MergedMcpServer } from '@/features/tools/lib/merge-tools'
import { TOP_COLORS, formatToolDate } from './constants'
import { ScopeBadge } from './scope-badge'

type McpTabProps = {
  data: MergedMcpServer[]
}

export const McpTab = ({ data }: McpTabProps) => {
  const { t } = useLocale()

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label={t('tools.detail.utilization')}
          value={`${utilizationPct}%`}
          sub={registeredCount > 0 ? t('tools.detail.registered', { '0': String(registeredCount), '1': String(activeCount) }) : t('tools.detail.noRegisteredServers')}
        />
        <KpiCard
          label={t('tools.detail.successRate')}
          value={totalCalls > 0 ? `${successRate.toFixed(1)}%` : '—'}
          sub={totalCalls > 0 ? t('tools.detail.totalCalls', { '0': totalCalls.toLocaleString() }) : t('tools.detail.noCallData')}
        />
      </div>

      {donutData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('tools.detail.mcpRatio')}</CardTitle>
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
                            {d.value.toLocaleString()}{t('tools.detail.callsSuffix')} ({pct}%)
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
                <span className="mt-0.5 text-[11px] text-muted-foreground">{t('tools.table.calls')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.detail.mcpServers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState
              title={t('tools.detail.emptyMcp')}
              description={t('tools.detail.emptyMcpDesc')}
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
                  <TableHead>{t('tools.table.server')}</TableHead>
                  <TableHead>{t('tools.table.agent')}</TableHead>
                  <TableHead>{t('tools.table.scope')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.calls')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.success')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.fail')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.lastUsed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((server) => {
                  const isUnused = server.status === 'unused'
                  return (
                    <TableRow key={server.serverName} className={cn(isUnused && 'opacity-50')}>
                      <TableCell className="max-w-0">
                        <span className="block truncate font-mono text-xs font-medium">
                          {server.serverName}
                        </span>
                      </TableCell>
                      <TableCell>
                        {server.agentType ? (
                          <AgentBadge agent={server.agentType} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ScopeBadge scope={server.scope} projectName={server.projectName} />
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
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {server.lastUsed ? formatToolDate(server.lastUsed) : '—'}
                      </TableCell>
                    </TableRow>
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
