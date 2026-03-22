'use client'

import { useState, useEffect } from 'react'
import type { ConfigChange } from '@/shared/lib/config-tracker'
import type { ImpactCompareResult } from '@/shared/lib/queries'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DiffLine } from '@/shared/components/ui/diff-line'
import { getAgentColor } from '@/shared/lib/agents'
import { cn } from '@/shared/lib/utils'
import { configService } from '@/shared/services'
import { formatCostChart } from '@/shared/lib/format'

type ConfigTimelineProps = {
  data: ConfigChange[]
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const ChangeIndicator = ({ before, after, format }: { before: number; after: number; format: (v: number) => string }) => {
  if (before === 0 && after === 0) return <span className="text-muted-foreground">-</span>
  const diff = before === 0 ? 100 : ((after - before) / before) * 100
  const isPositive = diff > 0
  const isNeutral = Math.abs(diff) < 0.1

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm">{format(after)}</span>
      {!isNeutral && (
        <span className={cn('text-xs font-medium', isPositive ? 'text-red-500' : 'text-green-500')}>
          {isPositive ? '+' : ''}{diff.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

const ComparePanel = ({ date }: { date: string }) => {
  const [data, setData] = useState<ImpactCompareResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    configService.getConfigCompare({ date, days: 7 })
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [date])

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
  if (!data) return null

  const metrics = [
    { label: 'Avg Cost / req', before: data.before.avg_cost, after: data.after.avg_cost, format: formatCostChart },
    { label: 'Cache Rate', before: data.before.cache_rate, after: data.after.cache_rate, format: formatPercent },
    { label: 'Tool Success Rate', before: data.before.tool_success_rate, after: data.after.tool_success_rate, format: formatPercent },
  ]

  return (
    <div className="mt-3 rounded-lg bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">Before vs After (7 days)</div>
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0 space-y-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{m.label}</div>
            <div className="flex flex-col gap-0.5">
              <div className="font-mono text-xs text-muted-foreground">{m.format(m.before)}</div>
              <ChangeIndicator before={m.before} after={m.after} format={m.format} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
        <span>Before: {data.before.request_count} reqs</span>
        <span>After: {data.after.request_count} reqs</span>
      </div>
    </div>
  )
}

export const ConfigTimeline = ({ data }: ConfigTimelineProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p>No config change history found.</p>
      </div>
    )
  }

  const selected = selectedIndex !== null ? data[selectedIndex] : null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Left: Timeline */}
      <div className="relative ml-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border-subtle)]" />

        {data.map((change, index) => {
          const agentHex = getAgentColor(change.agent_type)
          const isSelected = selectedIndex === index
          const dateStr = new Date(change.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div key={`${change.commit_hash}-${change.file_path}`} className="relative pl-8 pb-3">
              <div
                className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                style={{ backgroundColor: agentHex }}
              />

              <button
                type="button"
                onClick={() => setSelectedIndex(isSelected ? null : index)}
                className={cn(
                  'w-full text-left cursor-pointer rounded-lg p-3 transition-colors hover:bg-muted/50',
                  isSelected && 'bg-muted/50 ring-1 ring-primary'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                  <Badge
                    className="text-[10px] px-1.5 py-0"
                    style={{ backgroundColor: agentHex, color: 'white' }}
                  >
                    {change.agent_type}
                  </Badge>
                </div>

                <div className="font-medium text-sm">{change.file_path}</div>

                <div className="text-xs text-muted-foreground mt-1 truncate">
                  <span className="font-mono text-[10px]">{change.commit_hash.slice(0, 7)}</span>
                  {' '}
                  {change.commit_message}
                </div>
              </button>

              {isSelected && <ComparePanel date={change.date} />}
            </div>
          )
        })}
      </div>

      {/* Right: Diff Panel */}
      <Card className="max-h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {selected ? selected.file_path : 'Diff Viewer'}
          </CardTitle>
          {selected && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ backgroundColor: getAgentColor(selected.agent_type), color: 'white' }}
              >
                {selected.agent_type}
              </Badge>
              <span className="font-mono">{selected.commit_hash.slice(0, 7)}</span>
              <span>{selected.commit_message}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {selected ? (
            selected.diff ? (
              <pre className="overflow-auto h-full rounded-md bg-muted/30 p-4 text-xs font-mono leading-5">
                {selected.diff.split('\n').map((line, i) => (
                  <DiffLine key={i} line={line} />
                ))}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No diff data available.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Select an item from the timeline to view its diff.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
