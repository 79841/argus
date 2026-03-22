'use client'

import { useState } from 'react'
import { useLocale } from '@/shared/lib/i18n'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { FilterBar } from '@/shared/components/filter-bar'
import { cn } from '@/shared/lib/utils'
import { formatCost } from '@/shared/lib/format'
import { useInsightsData, SuggestionsSection, BudgetGauges, HighCostTable, ModelEfficiencyTable } from '@/features/insights'

const DATE_OPTIONS = [
  { value: '7', labelKey: 'insights.date.7' },
  { value: '14', labelKey: 'insights.date.14' },
  { value: '30', labelKey: 'insights.date.30' },
  { value: '90', labelKey: 'insights.date.90' },
]

const CAUSE_I18N_KEYS: Record<string, string> = {
  expensive_model: 'insights.cause.expensiveModel',
  many_tool_calls: 'insights.cause.manyToolCalls',
  many_requests: 'insights.cause.manyRequests',
  no_cache: 'insights.cause.noCache',
}

export default function InsightsPage() {
  const { t } = useLocale()
  const [days, setDays] = useState('7')

  const { data, suggestions, loading, suggestionsLoading } = useInsightsData(days)

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
    if (!top) return '-'
    const i18nKey = CAUSE_I18N_KEYS[top[0]]
    return i18nKey ? t(i18nKey) : top[0]
  })()

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
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
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </FilterBar>

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="flex flex-col gap-4">

          <SuggestionsSection suggestions={suggestions} suggestionsLoading={suggestionsLoading} />

          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label={t('insights.kpi.top10Total')}
              value={formatCost(totalHighCost)}
              loading={loading}
            />
            <KpiCard
              label={t('insights.kpi.avgSessionCost')}
              value={formatCost(avgSessionCost)}
              loading={loading}
            />
            <KpiCard
              label={t('insights.kpi.topCause')}
              value={worstCause}
              loading={loading}
            />
          </div>

          {data?.budgetStatus && (
            <BudgetGauges budgetStatus={data.budgetStatus} />
          )}

          <HighCostTable data={data?.highCostSessions ?? []} loading={loading} />

          <ModelEfficiencyTable data={data?.modelEfficiency ?? []} loading={loading} />

        </div>
      </div>
    </div>
  )
}
