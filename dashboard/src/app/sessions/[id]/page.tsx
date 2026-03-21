'use client'

import { useParams, useRouter } from 'next/navigation'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { useLocale } from '@/shared/lib/i18n'
import { FilterBar } from '@/shared/components/filter-bar'
import { formatCost, formatTokens, formatDuration } from '@/shared/lib/format'
import { useSessionDetail, PromptGroupCard, PromptCostChart, SessionHeader } from '@/features/sessions'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()

  const sessionId = typeof params.id === 'string' ? decodeURIComponent(params.id) : ''

  const { loading, summary, promptGroups, cacheRate, costChartData } = useSessionDetail(sessionId)

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
              value={formatDuration(summary.duration_ms)}
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
            <h3 className="mb-3 text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
            {promptGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('sessions.detail.noEvents')}
              </div>
            ) : (
              <div className="space-y-2">
                {promptGroups.map((group, idx) => (
                  <PromptGroupCard key={group.promptId} group={group} index={idx} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
