'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/components/ui/table'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { TOP_COLORS, formatToolDate } from './constants'
import { ScopeBadge } from './scope-badge'

type ToolListTabProps = {
  data: MergedToolItem[]
  emptyTitleKey: string
  emptyDescKey: string
  noRegisteredKey: string
}

export const ToolListTab = ({ data, emptyTitleKey, emptyDescKey, noRegisteredKey }: ToolListTabProps) => {
  const { t } = useLocale()

  const registeredCount = data.filter((d) => d.status !== 'unregistered').length
  const activeCount = data.filter((d) => d.status === 'active').length
  const utilizationPct = registeredCount > 0 ? Math.round((activeCount / registeredCount) * 100) : 0

  const totalCalls = data.reduce((s, d) => s + d.invocation_count, 0)
  const totalSuccess = data.reduce((s, d) => s + d.success_count, 0)
  const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0

  const chartData = data
    .filter((d) => d.invocation_count > 0)
    .map((d) => ({
      name: d.name,
      count: d.invocation_count,
      success: d.success_count,
      fail: d.fail_count,
    }))

  const chartHeight = Math.max(200, chartData.length * 40)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label={t('tools.detail.utilization')}
          value={`${utilizationPct}%`}
          sub={registeredCount > 0 ? t('tools.detail.registered', { '0': String(registeredCount), '1': String(activeCount) }) : t(noRegisteredKey)}
        />
        <KpiCard
          label={t('tools.detail.successRate')}
          value={totalCalls > 0 ? `${successRate.toFixed(1)}%` : '—'}
          sub={totalCalls > 0 ? t('tools.detail.totalCalls', { '0': totalCalls.toLocaleString() }) : t('tools.detail.noCallData')}
        />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('tools.detail.frequency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid
                    strokeDasharray={CHART_THEME.grid.strokeDasharray}
                    stroke={CHART_THEME.grid.stroke}
                    strokeOpacity={CHART_THEME.grid.strokeOpacity}
                    horizontal={false}
                  />
                  <XAxis type="number" fontSize={CHART_THEME.axis.fontSize} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={CHART_THEME.axis.fontSize}
                    width={140}
                    tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 20)}...` : v)}
                  />
                  <Tooltip
                    contentStyle={CHART_THEME.tooltip.containerStyle}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as (typeof chartData)[number]
                      return (
                        <div style={CHART_THEME.tooltip.containerStyle}>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {d.count.toLocaleString()}{t('tools.detail.callsSuffix')} ({d.success} {t('tools.detail.success')}, {d.fail} {t('tools.detail.fail')})
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={`${entry.name}:${i}`} fill={TOP_COLORS[i % TOP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.detail.fullList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title={t(emptyTitleKey)} description={t(emptyDescKey)} />
          ) : (
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[24%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="text-xs text-muted-foreground">
                  <TableHead>{t('tools.table.name')}</TableHead>
                  <TableHead>{t('tools.table.agent')}</TableHead>
                  <TableHead>{t('tools.table.scope')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.calls')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.success')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.fail')}</TableHead>
                  <TableHead className="text-right">{t('tools.table.lastUsed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const isUnused = item.status === 'unused'
                  return (
                    <TableRow key={`${item.name}:${item.agentType ?? 'unknown'}`} className={cn(isUnused && 'opacity-50')}>
                      <TableCell className="max-w-0">
                        <span className="block truncate font-mono text-xs font-medium">
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.agentType ? (
                          <AgentBadge agent={item.agentType} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ScopeBadge scope={item.scope} projectName={item.projectName} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.invocation_count > 0 ? item.invocation_count : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {item.success_count > 0 ? item.success_count : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.fail_count > 0 ? (
                          <span className="text-red-600 dark:text-red-400">{item.fail_count}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {item.last_used ? formatToolDate(item.last_used) : '—'}
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
