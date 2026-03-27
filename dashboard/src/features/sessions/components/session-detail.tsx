'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { SessionModelCostChart } from '@/features/sessions/components/session-model-cost-chart'
import { TraceWaterfall } from '@/features/sessions/components/trace-waterfall'
import { PromptGroupCard } from '@/features/sessions/components/prompt-group-card'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatTokens, formatDuration, shortenModel, parseModels } from '@/shared/lib/format'
import { groupByPrompt } from '@/features/sessions/hooks/use-session-detail'
import { computeSummary } from '@/features/sessions/lib/compute-summary'

type SessionDetailProps = {
  session: SessionRow
  events: SessionDetailEvent[]
}

export const SessionDetail = ({ session, events }: SessionDetailProps) => {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState('list')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const summary = computeSummary(events, session)
  const rawGroups = useMemo(() => groupByPrompt(events), [events])
  const promptGroups = useMemo(
    () => sortOrder === 'asc' ? rawGroups : [...rawGroups].reverse(),
    [rawGroups, sortOrder],
  )

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
        <Tabs defaultValue="list" onValueChange={setActiveTab}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
              {activeTab === 'list' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortOrder === 'asc' ? t('sessions.detail.sortAsc') : t('sessions.detail.sortDesc')}
                </Button>
              )}
            </div>
            <TabsList>
              <TabsTrigger value="list">{t('sessions.detail.tab.list')}</TabsTrigger>
              <TabsTrigger value="waterfall">{t('sessions.detail.tab.waterfall')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list">
            {promptGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('sessions.detail.noEvents')}</div>
            ) : (
              <div className="space-y-2">
                {promptGroups.map((group, idx) => {
                  const originalIndex = sortOrder === 'asc' ? idx : promptGroups.length - 1 - idx
                  return (
                    <PromptGroupCard key={group.promptId} group={group} index={originalIndex} agentType={session.agent_type} />
                  )
                })}
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
