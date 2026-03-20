'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AgentBadge } from '@/components/ui/agent-badge'
import { SessionModelCostChart } from '@/components/session-model-cost-chart'
import { TraceWaterfall } from '@/components/trace-waterfall'
import type { SessionRow, SessionDetailEvent } from '@/lib/queries'
import type { AgentType } from '@/lib/agents'
import { useLocale } from '@/lib/i18n'
import { formatCost, formatCostDetail, formatCostChart, formatTokens, formatDuration, shortenModel, parseModels, formatTime } from '@/lib/format'

type PromptGroup = {
  promptId: string
  events: SessionDetailEvent[]
  cost: number
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

const eventBgColor = (ev: SessionDetailEvent): string => {
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

type SessionSummaryLocal = {
  agentType: string
  model: string
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  wallTime: number
  requestCount: number
  toolCallCount: number
  cacheRate: number
}

const computeSummary = (events: SessionDetailEvent[], session: SessionRow): SessionSummaryLocal => {
  const apiEvents = events.filter((e) => e.event_name === 'api_request')
  const toolEvents = events.filter((e) => e.event_name === 'tool_result')
  const totalInput = apiEvents.reduce((s, e) => s + (e.input_tokens || 0), 0)
  const totalCache = apiEvents.reduce((s, e) => s + (e.cache_read_tokens || 0), 0)
  const cacheRate = (totalInput + totalCache) > 0
    ? Math.round((totalCache / (totalInput + totalCache)) * 100)
    : 0
  return {
    agentType: session.agent_type,
    model: session.model,
    totalCost: apiEvents.reduce((s, e) => s + (e.cost_usd || 0), 0),
    inputTokens: totalInput,
    outputTokens: apiEvents.reduce((s, e) => s + (e.output_tokens || 0), 0),
    cacheReadTokens: totalCache,
    wallTime: session.duration_ms,
    requestCount: apiEvents.length,
    toolCallCount: toolEvents.length,
    cacheRate,
  }
}

type PromptGroupCardProps = {
  group: PromptGroup
  index: number
}

const PromptGroupCard = ({ group, index }: PromptGroupCardProps) => {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/30"
      >
        <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
        <span className="text-xs text-muted-foreground">{formatTime(group.startTime)}</span>
        <span className="text-xs text-muted-foreground">
          ({group.events.length}{t('sessions.promptGroup.events')})
        </span>
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
              className={`flex items-start gap-3 border-b border-[var(--border-subtle)] border-l-2 px-4 py-2 text-xs last:border-b-0 ${eventBgColor(ev)}`}
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

type SessionDetailProps = {
  session: SessionRow
  events: SessionDetailEvent[]
}

export const SessionDetail = ({ session, events }: SessionDetailProps) => {
  const { t } = useLocale()
  const summary = computeSummary(events, session)
  const promptGroups = groupByPrompt(events)

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <AgentBadge agent={summary.agentType as AgentType} />
        <div className="flex flex-wrap gap-1">
          {parseModels(summary.model).map((m) => (
            <Badge key={m} variant="outline" className="text-xs">
              {shortenModel(m)}
            </Badge>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {session.session_id.slice(0, 16)}
        </span>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-3 rounded-lg p-4 text-sm sm:grid-cols-6">
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.cost')}</div>
          <div className="font-semibold tabular-nums">{formatCost(summary.totalCost)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.input')}</div>
          <div className="font-semibold tabular-nums">{formatTokens(summary.inputTokens)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.output')}</div>
          <div className="font-semibold tabular-nums">{formatTokens(summary.outputTokens)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.cache')}</div>
          <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatTokens(summary.cacheReadTokens)}
            {summary.cacheRate > 0 && <span className="ml-1 text-xs font-normal">({summary.cacheRate}%)</span>}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.duration')}</div>
          <div className="font-semibold tabular-nums">{formatDuration(summary.wallTime)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('sessions.detail.reqTools')}</div>
          <div className="font-semibold tabular-nums">{summary.requestCount} / {summary.toolCallCount}</div>
        </div>
      </div>

      {/* Model Cost Breakdown */}
      <SessionModelCostChart events={events} />

      {/* Event Timeline */}
      <div>
        <Tabs defaultValue="list">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list">
            {promptGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('sessions.detail.noEvents')}</div>
            ) : (
              <div className="space-y-2">
                {promptGroups.map((group, idx) => (
                  <PromptGroupCard key={group.promptId} group={group} index={idx} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waterfall">
            <TraceWaterfall events={events} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
