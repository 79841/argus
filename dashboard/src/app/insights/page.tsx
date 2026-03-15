'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import { dataClient } from '@/lib/data-client'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentBadge } from '@/components/ui/agent-badge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AgentType } from '@/lib/agents'
import type { HighCostSession, ModelCostEfficiency, BudgetStatus } from '@/lib/queries'
import type { Suggestion } from '@/lib/suggestions'

const DATE_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
]

const CAUSE_LABELS: Record<string, { label: string; color: string }> = {
  expensive_model: { label: 'Expensive Model', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  many_tool_calls: { label: 'Many Tools', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  many_requests: { label: 'Many Requests', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  no_cache: { label: 'No Cache', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
}

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  warning: {
    border: 'border-l-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  info: {
    border: 'border-l-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
} as const

const formatCost = (v: number) => `$${v.toFixed(3)}`
const formatDuration = (ms: number) => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

const shortenModel = (model: string): string =>
  model.replace(/^claude-/, '').replace(/^models\//, '').replace(/-\d{8}$/, '')

type InsightsData = {
  highCostSessions: HighCostSession[]
  modelEfficiency: ModelCostEfficiency[]
  budgetStatus: BudgetStatus[]
}

type SuggestionsData = {
  suggestions: Suggestion[]
}

type SuggestionCardProps = {
  suggestion: Suggestion
}

const SuggestionCard = ({ suggestion }: SuggestionCardProps) => {
  const cfg = SEVERITY_CONFIG[suggestion.severity]
  const Icon = cfg.icon
  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border border-l-4 bg-card p-4',
        cfg.border
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cfg.iconColor)} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{suggestion.title}</span>
          <Badge className={cn('text-[10px] px-1.5 py-0 capitalize', cfg.badge)}>
            {suggestion.severity}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {suggestion.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
        <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
          <span>
            현재: <span className="font-medium text-foreground">{suggestion.metric}</span>
          </span>
          <span>
            목표: <span className="font-medium text-foreground">{suggestion.target}</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">개선 방법: </span>
          {suggestion.action}
        </p>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const [days, setDays] = useState('7')
  const [data, setData] = useState<InsightsData | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    dataClient.query('insights', { days: Number(days) })
      .then((res) => {
        setData(res as InsightsData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [days])

  const fetchSuggestions = useCallback(() => {
    setSuggestionsLoading(true)
    dataClient.query('suggestions', { days: Number(days) })
      .then((res) => {
        setSuggestions((res as SuggestionsData).suggestions ?? [])
        setSuggestionsLoading(false)
      })
      .catch(() => setSuggestionsLoading(false))
  }, [days])

  useEffect(() => {
    fetchData()
    fetchSuggestions()
  }, [fetchData, fetchSuggestions])

  const totalHighCost = data?.highCostSessions.reduce((s, r) => s + r.total_cost, 0) ?? 0
  const avgSessionCost = data?.highCostSessions.length
    ? totalHighCost / data.highCostSessions.length
    : 0
  const worstCause = (() => {
    if (!data?.highCostSessions.length) return '-'
    const counts: Record<string, number> = {}
    for (const s of data.highCostSessions) {
      for (const c of s.causes) counts[c] = (counts[c] ?? 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? (CAUSE_LABELS[top[0]]?.label ?? top[0]) : '-'
  })()

  const sessionColumns = [
    {
      key: 'agent_type',
      label: 'Agent',
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    {
      key: 'model',
      label: 'Model',
      format: (v: unknown) => (
        <span className="font-mono text-xs">
          {String(v).split(',').map(m => shortenModel(m.trim())).join(', ')}
        </span>
      ),
    },
    {
      key: 'total_cost',
      label: 'Cost',
      align: 'right' as const,
      format: (v: unknown) => <span className="font-semibold">{formatCost(Number(v))}</span>,
    },
    {
      key: 'request_count',
      label: 'Reqs',
      align: 'right' as const,
      format: (v: unknown) => String(v),
    },
    {
      key: 'tool_call_count',
      label: 'Tools',
      align: 'right' as const,
      format: (v: unknown) => String(v),
    },
    {
      key: 'causes',
      label: 'Causes',
      format: (v: unknown) => (
        <div className="flex flex-wrap gap-1">
          {(v as string[]).map(c => {
            const cfg = CAUSE_LABELS[c]
            return (
              <Badge key={c} className={cn('text-[10px] px-1.5 py-0', cfg?.color ?? 'bg-muted text-muted-foreground')}>
                {cfg?.label ?? c}
              </Badge>
            )
          })}
        </div>
      ),
    },
  ]

  const modelColumns = [
    {
      key: 'model',
      label: 'Model',
      format: (v: unknown) => <span className="font-mono text-xs">{shortenModel(String(v))}</span>,
    },
    {
      key: 'agent_type',
      label: 'Agent',
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    { key: 'request_count', label: 'Reqs', align: 'right' as const, format: (v: unknown) => Number(v).toLocaleString() },
    { key: 'total_cost', label: 'Total Cost', align: 'right' as const, format: (v: unknown) => formatCost(Number(v)) },
    { key: 'avg_cost_per_request', label: 'Avg/req', align: 'right' as const, format: (v: unknown) => formatCost(Number(v)) },
    { key: 'cost_per_1k_tokens', label: '$/1K tok', align: 'right' as const, format: (v: unknown) => `$${Number(v).toFixed(4)}` },
    { key: 'avg_duration_ms', label: 'Avg Speed', align: 'right' as const, format: (v: unknown) => formatDuration(Number(v)) },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Insights</h1>
          <p className="text-muted-foreground text-sm mt-1">
            High-cost sessions, model efficiency, and budget tracking
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium transition-colors',
                days === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <ChartCard title="Suggestions">
        {suggestionsLoading ? (
          <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-l-4 border-l-green-500 bg-card p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-semibold">모든 지표가 양호합니다</p>
              <p className="text-xs text-muted-foreground">현재 사용 패턴에서 개선이 필요한 항목이 없습니다.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}
      </ChartCard>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Top 10 Total"
          value={formatCost(totalHighCost)}
          loading={loading}
        />
        <KpiCard
          label="Avg Session Cost"
          value={formatCost(avgSessionCost)}
          loading={loading}
        />
        <KpiCard
          label="Top Cause"
          value={worstCause}
          loading={loading}
        />
      </div>

      {/* Budget Gauges */}
      {data?.budgetStatus.some(b => b.daily_cost_limit > 0) && (
        <ChartCard title="Daily Budget">
          <div className="grid grid-cols-3 gap-4 p-2">
            {data.budgetStatus.map((b) => {
              const usagePct = Math.min(b.daily_usage_pct, 100)
              const exceeded = b.daily_usage_pct > 100
              return (
                <div key={b.agent_type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <AgentBadge agent={b.agent_type as AgentType} />
                    <span className={cn('text-xs font-medium tabular-nums', exceeded && 'text-red-500')}>
                      {formatCost(b.daily_spent)} / {b.daily_cost_limit > 0 ? formatCost(b.daily_cost_limit) : 'No limit'}
                    </span>
                  </div>
                  {b.daily_cost_limit > 0 && (
                    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full transition-all',
                          exceeded ? 'bg-red-500' : 'bg-primary'
                        )}
                        style={{
                          width: `${usagePct}%`,
                          ...(!exceeded ? { backgroundColor: `var(--agent-${b.agent_type})` } : {}),
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ChartCard>
      )}

      {/* High Cost Sessions */}
      <ChartCard title="High-Cost Sessions (Top 10)">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : !data?.highCostSessions.length ? (
          <EmptyState title="No high-cost sessions" />
        ) : (
          <DataTable
            columns={sessionColumns}
            data={data.highCostSessions as unknown as Record<string, unknown>[]}
          />
        )}
      </ChartCard>

      {/* Model Cost Efficiency */}
      <ChartCard title="Model Cost Efficiency">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : !data?.modelEfficiency.length ? (
          <EmptyState title="No model data" />
        ) : (
          <DataTable
            columns={modelColumns}
            data={data.modelEfficiency as unknown as Record<string, unknown>[]}
          />
        )}
      </ChartCard>
    </div>
  )
}
