'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { FilterBar } from '@/shared/components/filter-bar'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { useLocale } from '@/shared/lib/i18n'
import { formatDuration, formatCostDetail } from '@/shared/lib/format'
import {
  useToolDetail,
  ToolDetailHeader,
  ToolTrendChart,
  ToolSessionsTable,
} from '@/features/tools'
import type { ToolDailyRow } from '@/shared/lib/queries'

const DATE_OPTIONS = [
  { value: 7, labelKey: 'tools.date.7' },
  { value: 14, labelKey: 'tools.date.14' },
  { value: 30, labelKey: 'tools.date.30' },
  { value: 90, labelKey: 'tools.date.90' },
]

const toCallTrend = (daily: ToolDailyRow[]) =>
  daily.map((d) => ({ date: d.date, value: d.count }))

const toSuccessRateTrend = (daily: ToolDailyRow[]) =>
  daily.map((d) => ({
    date: d.date,
    value: d.count > 0 ? Math.round((d.success_count / d.count) * 100) : 0,
  }))

const toDurationTrend = (daily: ToolDailyRow[]) =>
  daily.map((d) => ({ date: d.date, value: Math.round(d.avg_duration_ms) }))

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()

  const toolName = typeof params.name === 'string' ? decodeURIComponent(params.name) : ''
  const [days, setDays] = useState(7)

  const { tool, daily, sessions, loading } = useToolDetail(toolName, days)

  const successRate = tool && tool.invocation_count > 0
    ? Math.round((tool.success_count / tool.invocation_count) * 100)
    : null

  const CATEGORY_MAP: Record<string, string> = {
    mcp: 'MCP',
    Agent: 'Orchestration',
    Skill: 'Orchestration',
  }
  const category = tool
    ? (toolName.startsWith('mcp')
        ? 'MCP'
        : CATEGORY_MAP[toolName] ?? 'Built-in')
    : undefined

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <button
          type="button"
          onClick={() => router.push('/tools')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('tools.detail.back')}
        </button>
        <span className="text-sm font-medium font-mono">{toolName}</span>
        <div className="ml-auto flex items-center gap-1 rounded-md border bg-background p-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                days === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </FilterBar>

      <div className="flex-1 overflow-auto px-4 py-4">
        {loading ? (
          <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : !tool ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title={t('tools.detail.noData')} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ToolDetailHeader
              toolName={toolName}
              category={category}
              lastUsed={tool.last_used}
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label={t('tools.detail.totalCalls')}
                value={tool.invocation_count.toLocaleString()}
              />
              <KpiCard
                label={t('tools.detail.successRateKpi')}
                value={successRate !== null ? `${successRate}%` : '—'}
              />
              <KpiCard
                label={t('tools.detail.avgDuration')}
                value={formatDuration(tool.avg_duration_ms)}
              />
              <KpiCard
                label={t('tools.detail.totalCost')}
                value={formatCostDetail(tool.total_cost)}
              />
            </div>

            <ToolTrendChart
              data={toCallTrend(daily)}
              title={t('tools.detail.callTrend')}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ToolTrendChart
                data={toSuccessRateTrend(daily)}
                title={t('tools.detail.successTrend')}
                color="oklch(0.65 0.18 150)"
                formatter={(v) => `${v}%`}
              />
              <ToolTrendChart
                data={toDurationTrend(daily)}
                title={t('tools.detail.durationTrend')}
                color="oklch(0.62 0.17 300)"
                formatter={formatDuration}
              />
            </div>

            <ToolSessionsTable sessions={sessions} />
          </div>
        )}
      </div>
    </div>
  )
}
