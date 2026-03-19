'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { AgentBadge } from '@/components/ui/agent-badge'
import { KpiCard } from '@/components/ui/kpi-card'
import { EmptyState } from '@/components/ui/empty-state'
import { dataClient } from '@/lib/data-client'
import { useLocale } from '@/lib/i18n'
import { CHART_THEME } from '@/lib/chart-theme'
import type { SessionDetailEvent, SessionSummary } from '@/lib/queries'
import type { AgentType } from '@/lib/agents'
import { FilterBar } from '@/components/filter-bar'
import { formatCost, formatCostDetail, formatCostChart, formatTokens, formatDuration, shortenModel, parseModels, formatTime } from '@/lib/format'

type PromptGroup = {
  promptId: string
  events: SessionDetailEvent[]
  cost: number
  toolCount: number
  startTime: string
}

const groupByPrompt = (events: SessionDetailEvent[]): PromptGroup[] => {
  const map = new Map<string, SessionDetailEvent[]>()
  const order: string[] = []

  for (const ev of events) {
    const key = ev.prompt_id || `_no_prompt_${ev.timestamp}`
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(ev)
  }

  return order.map((promptId) => {
    const evts = map.get(promptId)!
    return {
      promptId,
      events: evts,
      cost: evts.reduce((s, e) => s + (e.cost_usd || 0), 0),
      toolCount: evts.filter((e) => e.event_name === 'tool_result').length,
      startTime: evts[0].timestamp,
    }
  })
}

const eventLabel = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return `API Request${ev.model ? ` · ${shortenModel(ev.model)}` : ''}`
    case 'tool_result':
      return `Tool: ${ev.tool_name || 'unknown'}${ev.tool_success === 0 ? ' [FAIL]' : ''}`
    case 'user_prompt':
      return 'User Prompt'
    case 'tool_decision':
      return `Tool Decision: ${ev.tool_name || 'unknown'}`
    case 'api_error':
      return 'API Error'
    default:
      return ev.event_name
  }
}

const eventDotColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'bg-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'bg-red-500' : 'bg-emerald-500'
    case 'user_prompt':
      return 'bg-violet-500'
    case 'api_error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const eventBorderColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'border-l-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'border-l-red-500' : 'border-l-emerald-500'
    case 'user_prompt':
      return 'border-l-violet-500'
    case 'api_error':
      return 'border-l-red-500'
    default:
      return 'border-l-gray-300'
  }
}

type PromptGroupCardProps = {
  group: PromptGroup
  index: number
  t: (key: string) => string
}

const PromptGroupCard = ({ group, index, t }: PromptGroupCardProps) => {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/30"
      >
        <span className="font-mono text-xs text-muted-foreground">
          {t('sessions.detail.promptNum')}{index + 1}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(group.startTime)}</span>
        <span className="text-xs text-muted-foreground">
          ({group.events.length}{t('sessions.promptGroup.events')})
        </span>
        {group.toolCount > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {group.toolCount} {t('sessions.detail.toolCalls')}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs font-medium tabular-nums">
          {formatCostDetail(group.cost)}
        </span>
        <span className="text-muted-foreground">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div>
          {group.events.map((ev, i) => (
            <div
              key={`${ev.timestamp}-${i}`}
              className={`flex items-start gap-3 border-b border-[var(--border-subtle)] border-l-2 px-4 py-2 text-xs last:border-b-0 ${eventBorderColor(ev)}`}
            >
              <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${eventDotColor(ev)}`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{eventLabel(ev)}</div>
                {ev.event_name === 'user_prompt' && ev.body && (
                  <p className="mt-1 whitespace-pre-wrap break-words rounded bg-violet-50 px-2 py-1.5 text-xs text-foreground dark:bg-violet-950/30">
                    {ev.body}
                  </p>
                )}
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                  <span>{formatTime(ev.timestamp)}</span>
                  {ev.event_name === 'api_request' && (
                    <>
                      <span>in: {formatTokens(ev.input_tokens)}</span>
                      <span>out: {formatTokens(ev.output_tokens)}</span>
                      {ev.cache_read_tokens > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          cache: {formatTokens(ev.cache_read_tokens)}
                        </span>
                      )}
                      <span className="font-medium">{formatCostChart(ev.cost_usd)}</span>
                    </>
                  )}
                  {ev.duration_ms > 0 && <span>{formatDuration(ev.duration_ms)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type CostChartDatum = {
  label: string
  cost: number
  toolCount: number
}

type CostChartProps = {
  data: CostChartDatum[]
  title: string
}

const PromptCostChart = ({ data, title }: CostChartProps) => {
  if (data.length === 0) return null

  return (
    <div className="rounded-lg p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis
            dataKey="label"
            tick={{ ...CHART_THEME.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={CHART_THEME.axis.axisLine}
          />
          <YAxis
            tickFormatter={(v: number) => formatCostDetail(v)}
            tick={{ ...CHART_THEME.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={CHART_THEME.axis.axisLine}
            width={60}
          />
          <Tooltip
            contentStyle={CHART_THEME.tooltip.containerStyle}
            labelStyle={CHART_THEME.tooltip.labelStyle}
            itemStyle={CHART_THEME.tooltip.itemStyle}
            formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
          />
          <Bar
            dataKey="cost"
            fill="oklch(0.55 0.12 280)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()

  const sessionId = typeof params.id === 'string' ? decodeURIComponent(params.id) : ''

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [events, setEvents] = useState<SessionDetailEvent[]>([])

  useEffect(() => {
    if (!sessionId) return

    setLoading(true)
    dataClient.query(`sessions/${encodeURIComponent(sessionId)}`, { summary: 'true' })
      .then((data) => {
        const d = data as { summary: SessionSummary | null; events: SessionDetailEvent[] }
        setSummary(d.summary ?? null)
        setEvents(Array.isArray(d.events) ? d.events : [])
        setLoading(false)
      })
      .catch(() => {
        setSummary(null)
        setEvents([])
        setLoading(false)
      })
  }, [sessionId])

  const promptGroups = groupByPrompt(events)

  const costChartData: CostChartDatum[] = promptGroups.map((g, i) => ({
    label: `#${i + 1}`,
    cost: g.cost,
    toolCount: g.toolCount,
  }))

  const cacheRate = summary
    ? Math.round(
        (summary.input_tokens + summary.cache_read_tokens) > 0
          ? (summary.cache_read_tokens / (summary.input_tokens + summary.cache_read_tokens)) * 100
          : 0
      )
    : 0

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <FilterBar>
          <button type="button" onClick={() => router.push('/sessions')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('sessions.detail.back')}
          </button>
        </FilterBar>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('sessions.detail.loading')}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex h-full flex-col">
        <FilterBar>
          <button type="button" onClick={() => router.push('/sessions')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('sessions.detail.back')}
          </button>
        </FilterBar>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState title={t('sessions.empty')} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <button type="button" onClick={() => router.push('/sessions')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t('sessions.detail.back')}
        </button>
        <span className="text-sm font-medium">{summary.project_name || t('sessions.detail.noProject')}</span>
      </FilterBar>

      <div className="flex-1 overflow-auto px-4 py-4">
      <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AgentBadge agent={summary.agent_type as AgentType} />
          <div className="flex flex-wrap gap-1">
            {parseModels(summary.model || '').map((m) => (
              <Badge key={m} variant="outline" className="text-xs">
                {shortenModel(m)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="font-mono text-xs text-muted-foreground">
            {sessionId.slice(0, 20)}
            {sessionId.length > 20 ? '…' : ''}
          </span>
          {summary.project_name && (
            <span className="text-xs text-muted-foreground">{summary.project_name}</span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label={t('sessions.detail.cost')}
          value={formatCost(summary.total_cost)}
        />
        <KpiCard
          label={t('sessions.detail.input')}
          value={formatTokens(summary.input_tokens)}
        />
        <KpiCard
          label={t('sessions.detail.output')}
          value={formatTokens(summary.output_tokens)}
        />
        <KpiCard
          label={t('sessions.detail.cache')}
          value={formatTokens(summary.cache_read_tokens)}
          sub={cacheRate > 0 ? `${cacheRate}%` : undefined}
        />
        <KpiCard
          label={t('sessions.detail.duration')}
          value={formatDuration(summary.duration_ms)}
        />
        <KpiCard
          label={t('sessions.detail.reqTools')}
          value={`${summary.request_count} / ${summary.tool_count}`}
        />
      </div>

      {/* Prompt Cost Chart */}
      {costChartData.length > 1 && (
        <PromptCostChart data={costChartData} title={t('sessions.detail.costChart')} />
      )}

      {/* Event Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
        {promptGroups.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t('sessions.detail.noEvents')}
          </div>
        ) : (
          <div className="space-y-2">
            {promptGroups.map((group, idx) => (
              <PromptGroupCard key={group.promptId} group={group} index={idx} t={t} />
            ))}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  )
}
