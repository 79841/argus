'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { DiffLine } from '@/shared/components/ui/diff-line'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCostChart, formatTokens, formatDuration } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { useImpactData } from '../hooks/use-impact-data'
import type { EnrichedChange } from '../hooks/use-impact-data'
import type { ImpactTabProps, CategoryType } from '@/features/usage/types/usage'
import type { ImpactMetrics } from '@/shared/lib/queries'

const CATEGORY_OPTIONS: CategoryType[] = ['all', 'rules', 'tools']
const COMPARE_OPTIONS = [7, 14] as const

const CATEGORY_LABELS: Record<CategoryType, string> = {
  all: 'All',
  rules: 'Rules',
  tools: 'Tools',
}

const CATEGORY_COLORS: Record<'rules' | 'tools', string> = {
  rules: 'oklch(0.62 0.17 300)',
  tools: 'oklch(0.60 0.16 200)',
}

type MetricDef = {
  key: keyof ImpactMetrics
  label: string
  format: (v: number) => string
  inverted: boolean
}

const METRICS: MetricDef[] = [
  { key: 'avg_cost', label: 'Avg Cost', format: formatCostChart, inverted: true },
  { key: 'avg_tokens', label: 'Avg Tokens', format: formatTokens, inverted: true },
  { key: 'cache_rate', label: 'Cache Rate', format: (v) => `${v.toFixed(1)}%`, inverted: false },
  { key: 'tool_success_rate', label: 'Tool Success', format: (v) => `${v.toFixed(1)}%`, inverted: false },
  { key: 'avg_duration_ms', label: 'Avg Duration', format: formatDuration, inverted: true },
  { key: 'reqs_per_session', label: 'Reqs/Session', format: (v) => v.toFixed(1), inverted: true },
]

const MetricCell = ({ before, after, metric }: { before: number; after: number; metric: MetricDef }) => {
  const diff = before === 0 ? (after === 0 ? 0 : 100) : ((after - before) / before) * 100
  const isNeutral = Math.abs(diff) < 0.1
  const isPositive = diff > 0
  const isGood = metric.inverted ? !isPositive : isPositive

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{metric.label}</div>
      <div className="font-mono text-xs text-muted-foreground">{metric.format(before)}</div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-medium">{metric.format(after)}</span>
        {!isNeutral && (
          <span className={cn('text-[10px] font-semibold', isGood ? 'text-green-600' : 'text-red-500')}>
            {isPositive ? '+' : ''}{diff.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

const ChangeCard = ({ change, compareDays }: { change: EnrichedChange; compareDays: number }) => {
  const [diffOpen, setDiffOpen] = useState(false)

  const dateStr = new Date(change.date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            className="text-[10px] px-1.5 py-0"
            style={{
              backgroundColor: CATEGORY_COLORS[change.category],
              color: 'white',
            }}
          >
            {change.category === 'rules' ? 'R' : 'T'}
          </Badge>
          <span className="text-sm font-medium">{change.file_path}</span>
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{change.commit_hash.slice(0, 7)}</span>
        </div>

        <div className="text-xs text-muted-foreground truncate">{change.commit_message}</div>

        {change.impact && (change.impact.before.request_count > 0 || change.impact.after.request_count > 0) ? (
          <>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {METRICS.map(m => (
                <MetricCell
                  key={m.key}
                  before={change.impact!.before[m.key]}
                  after={change.impact!.after[m.key]}
                  metric={m}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>Before: {change.impact.before.request_count} reqs ({compareDays}d)</span>
              <span>After: {change.impact.after.request_count} reqs ({compareDays}d)</span>
            </div>
          </>
        ) : (
          <div className="py-2 text-xs text-muted-foreground">
            No metric data available for comparison period
          </div>
        )}

        {change.diff && (
          <div>
            <button
              type="button"
              onClick={() => setDiffOpen(!diffOpen)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {diffOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              View Diff
            </button>
            {diffOpen && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/30 p-3 text-[11px] font-mono leading-5">
                {change.diff.split('\n').map((line, i) => (
                  <DiffLine key={i} line={line} />
                ))}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const ImpactTab = ({ agentType, project, dateRange }: ImpactTabProps) => {
  const [category, setCategory] = useState<CategoryType>('all')
  const [compareDays, setCompareDays] = useState<number>(7)

  const { changes, dailyMetrics, loading } = useImpactData({
    agentType,
    project,
    dateRange,
    category,
    compareDays,
  })

  const changeMarkers = useMemo(() =>
    changes.map(c => ({
      date: c.date.slice(0, 10),
      label: c.category === 'rules' ? 'R' : 'T',
      category: c.category,
    })),
    [changes]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Category:</span>
          <div className="flex gap-1">
            {CATEGORY_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  category === c
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Compare:</span>
          <div className="flex gap-1">
            {COMPARE_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setCompareDays(d)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  compareDays === d
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading...</div>
      ) : changes.length === 0 ? (
        <EmptyState
          title="No config changes"
          description="Config changes to CLAUDE.md, .mcp.json, etc. will appear here with before/after impact analysis."
        />
      ) : (
        <>
          <ChartCard title="Impact Timeline" height={220} empty={dailyMetrics.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid {...CHART_THEME.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }}
                  tickLine={false}
                  tickFormatter={d => d.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }}
                  tickLine={false}
                  tickFormatter={v => formatCostChart(v)}
                  width={55}
                />
                <Tooltip
                  contentStyle={CHART_THEME.tooltip.containerStyle}
                  labelStyle={CHART_THEME.tooltip.labelStyle}
                  itemStyle={CHART_THEME.tooltip.itemStyle}
                  formatter={(v: unknown) => [formatCostChart(Number(v)), 'Avg Cost']}
                />
                <Line
                  type="monotone"
                  dataKey="avg_cost"
                  stroke="oklch(0.55 0.12 280)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                  name="Avg Cost/req"
                />
                {changeMarkers.map((marker, i) => (
                  <ReferenceLine
                    key={`${marker.date}-${i}`}
                    x={marker.date}
                    stroke={CATEGORY_COLORS[marker.category]}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: marker.label,
                      position: 'top',
                      fill: CATEGORY_COLORS[marker.category],
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Change Impact Details</h3>
            {changes.map((change) => (
              <ChangeCard
                key={`${change.commit_hash}-${change.file_path}`}
                change={change}
                compareDays={compareDays}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
