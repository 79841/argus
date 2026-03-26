'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { SessionModelCostChart } from '@/features/sessions/components/session-model-cost-chart'
import { computeSummary } from '@/features/sessions/lib/compute-summary'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatTokens, formatDuration, shortenModel, parseModels, formatRelativeTime } from '@/shared/lib/format'

export type SessionPreviewProps = {
  session: SessionRow
  events: SessionDetailEvent[]
  loading?: boolean
}

const KpiItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
)

const PreviewSkeleton = () => (
  <div className="px-4 py-4 flex flex-col gap-4 animate-pulse">
    <div className="flex items-center gap-2">
      <div className="h-5 w-16 rounded bg-muted" />
      <div className="h-5 w-24 rounded bg-muted" />
      <div className="ml-auto h-4 w-28 rounded bg-muted" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
    <div className="h-24 rounded bg-muted" />
    <div className="h-9 w-full rounded bg-muted" />
  </div>
)

export const SessionPreview = ({ session, events, loading = false }: SessionPreviewProps) => {
  const { t } = useLocale()

  if (loading) return <PreviewSkeleton />

  const summary = computeSummary(events, session)

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
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
        {session.project_name && (
          <span className="text-xs text-muted-foreground">{session.project_name}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(session.last_activity || session.started_at, t)}
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3 rounded-lg border p-3">
        <KpiItem label={t('sessions.detail.cost')} value={formatCost(summary.totalCost)} />
        <KpiItem label={t('sessions.detail.input')} value={formatTokens(summary.inputTokens)} />
        <KpiItem label={t('sessions.detail.output')} value={formatTokens(summary.outputTokens)} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">{t('sessions.detail.cache')}</span>
          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatTokens(summary.cacheReadTokens)}
            {summary.cacheRate > 0 && (
              <span className="ml-1 text-xs font-normal">({summary.cacheRate}%)</span>
            )}
          </span>
        </div>
        <KpiItem label={t('sessions.detail.duration')} value={formatDuration(summary.wallTime)} />
        <KpiItem
          label={t('sessions.detail.reqTools')}
          value={`${summary.requestCount} / ${summary.toolCallCount}`}
        />
      </div>

      {/* Model Cost Chart */}
      <SessionModelCostChart events={events} />

      {/* View Detail Button */}
      <Link
        href={`/sessions/${encodeURIComponent(session.session_id)}`}
        className={buttonVariants({ variant: 'outline' }) + ' w-full'}
      >
        {t('common.viewDetail')}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  )
}
