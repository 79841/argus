'use client'

import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { SessionModelCostChart } from '@/features/sessions/components/session-model-cost-chart'
import { TraceWaterfall } from '@/features/sessions/components/trace-waterfall'
import { PromptGroupCard } from '@/features/sessions/components/prompt-group-card'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatTokens, formatDuration, shortenModel, parseModels, computeCacheRate } from '@/shared/lib/format'
import { groupByPrompt } from '@/features/sessions/hooks/use-session-detail'

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
  const cacheRate = Math.round(computeCacheRate(totalInput, totalCache))
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
