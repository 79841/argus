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
import { Badge } from '@/shared/components/ui/badge'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { cn } from '@/shared/lib/utils'
import type { MergedToolItem } from '@/features/tools/lib/merge-tools'
import { TOP_COLORS, STATUS_BADGE, SCOPE_BADGE, formatToolDate } from './constants'

type ToolListTabProps = {
  data: MergedToolItem[]
  emptyTitle: string
  emptyDescription: string
  noRegisteredLabel: string
}

export const ToolListTab = ({ data, emptyTitle, emptyDescription, noRegisteredLabel }: ToolListTabProps) => {
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
          label="활용률"
          value={`${utilizationPct}%`}
          sub={registeredCount > 0 ? `등록 ${registeredCount}개 중 ${activeCount}개 활용` : noRegisteredLabel}
        />
        <KpiCard
          label="성공률"
          value={totalCalls > 0 ? `${successRate.toFixed(1)}%` : '—'}
          sub={totalCalls > 0 ? `전체 ${totalCalls.toLocaleString()}회 호출` : '호출 데이터 없음'}
        />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">사용 빈도</CardTitle>
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
                            {d.count.toLocaleString()}회 ({d.success} 성공, {d.fail} 실패)
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={entry.name} fill={TOP_COLORS[i % TOP_COLORS.length]} />
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
          <CardTitle className="text-sm font-medium">전체 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Fail</TableHead>
                  <TableHead className="text-right">Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const statusCfg = STATUS_BADGE[item.status]
                  const isUnused = item.status === 'unused'
                  return (
                    <TableRow key={item.name} className={cn(isUnused && 'opacity-50')}>
                      <TableCell className="max-w-0">
                        <span className="block truncate font-mono text-xs font-medium">
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.scope ? (
                          <Badge className={cn('text-[10px] px-1.5 py-0', SCOPE_BADGE[item.scope].className)}>
                            {SCOPE_BADGE[item.scope].label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] px-1.5 py-0', statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
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
