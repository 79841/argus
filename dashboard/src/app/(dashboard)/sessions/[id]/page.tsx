'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowUpDown } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { useLocale } from '@/shared/lib/i18n'
import { FilterBar } from '@/shared/components/filter-bar'
import { formatCost, formatTokens, formatDurationLong } from '@/shared/lib/format'
import { useSessionDetail, PromptGroupCard, PromptCostChart, SessionHeader } from '@/features/sessions'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()

  const sessionId = typeof params.id === 'string' ? decodeURIComponent(params.id) : ''

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { loading, summary, promptGroups: rawGroups, cacheRate, costChartData } = useSessionDetail(sessionId)
  const promptGroups = useMemo(
    () => sortOrder === 'asc' ? rawGroups : [...rawGroups].reverse(),
    [rawGroups, sortOrder],
  )

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

          <SessionHeader summary={summary} sessionId={sessionId} />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
              value={formatDurationLong(summary.duration_ms)}
            />
            <KpiCard
              label={t('sessions.detail.reqTools')}
              value={`${summary.request_count} / ${summary.tool_count}`}
            />
          </div>

          {costChartData.length > 1 && (
            <PromptCostChart data={costChartData} title={t('sessions.detail.costChart')} />
          )}

          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === 'asc' ? t('sessions.detail.sortAsc') : t('sessions.detail.sortDesc')}
              </Button>
            </div>
            {promptGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('sessions.detail.noEvents')}
              </div>
            ) : (
              <div className="space-y-2">
                {promptGroups.map((group, idx) => {
                  const originalIndex = sortOrder === 'asc' ? idx : promptGroups.length - 1 - idx
                  return (
                    <PromptGroupCard key={group.promptId} group={group} index={originalIndex} />
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
