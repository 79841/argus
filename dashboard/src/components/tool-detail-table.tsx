'use client'

import type { ToolDetailRow } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTokens, formatDuration } from '@/lib/format'

type ToolDetailTableProps = {
  data: ToolDetailRow[]
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Built-in': { label: 'Built-in', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900' },
  'Orchestration': { label: 'Orchestration', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900' },
  'MCP': { label: 'MCP', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900' },
}

const formatCost = (value: number): string => `$${value.toFixed(4)}`

const formatToolName = (name: string): string => {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__')
    if (parts.length >= 3) {
      return `${parts[1]}/${parts.slice(2).join('/')}`
    }
  }
  return name
}

const FAIL_RATE_THRESHOLD = 0.2

const getFailRate = (row: ToolDetailRow): number =>
  row.invocation_count > 0 ? row.fail_count / row.invocation_count : 0

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const getFailRateColor = (rate: number): string => {
  if (rate >= FAIL_RATE_THRESHOLD) return 'text-red-600 dark:text-red-400 font-medium'
  if (rate >= 0.1) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

export const ToolDetailTable = ({ data }: ToolDetailTableProps) => {
  const totalCost = data.reduce((sum, r) => sum + r.total_cost, 0)

  const grouped = data.reduce<Record<string, ToolDetailRow[]>>((acc, row) => {
    if (!acc[row.category]) acc[row.category] = []
    acc[row.category].push(row)
    return acc
  }, {})

  const categoryOrder = ['Orchestration', 'Built-in']

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const rows = grouped[category]
        if (!rows || rows.length === 0) return null
        const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['Built-in']

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Badge className={cn('text-[10px] px-1.5 py-0', config.color, config.bg)}>
                  {config.label}
                </Badge>
                <span className="text-muted-foreground">
                  {rows.length} tools, {rows.reduce((sum, r) => sum + r.invocation_count, 0)} total calls
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Tool</th>
                      <th className="pb-2 pr-4 font-medium text-right">Calls</th>
                      <th className="pb-2 pr-4 font-medium text-right">Success</th>
                      <th className="pb-2 pr-4 font-medium text-right">Fail</th>
                      <th className="pb-2 pr-4 font-medium text-right">Fail Rate</th>
                      <th className="pb-2 pr-4 font-medium text-right">Avg Duration</th>
                      <th className="pb-2 pr-4 font-medium text-right">Total Duration</th>
                      <th className="pb-2 pr-4 font-medium text-right">Prompts</th>
                      <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                      <th className="pb-2 pr-4 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Cost %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const failRate = getFailRate(row)
                      const isHighFailRate = failRate >= FAIL_RATE_THRESHOLD
                      const costShare = totalCost > 0 ? row.total_cost / totalCost : 0

                      return (
                        <tr
                          key={row.tool_name}
                          className={cn(
                            'border-b border-border/50 last:border-0',
                            isHighFailRate && 'bg-red-50 dark:bg-red-950/30',
                          )}
                        >
                          <td className="py-2.5 pr-4 font-mono text-xs">
                            <span className="flex items-center gap-1.5">
                              {isHighFailRate && (
                                <span className="text-red-500" title="High failure rate">!</span>
                              )}
                              {formatToolName(row.tool_name)}
                            </span>
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
                          <td className={cn('py-2.5 pr-4 text-right', getFailRateColor(failRate))}>
                            {formatPercent(failRate)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-muted-foreground">
                            {formatDuration(row.avg_duration_ms)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-muted-foreground">
                            {formatDuration(row.total_duration_ms)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-muted-foreground">
                            {row.prompt_count}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {formatTokens(row.total_tokens)}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-medium">
                            {formatCost(row.total_cost)}
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground">
                            {formatPercent(costShare)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
