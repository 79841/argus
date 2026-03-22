'use client'

import { useState } from 'react'
import type { AgentType } from '@/shared/lib/agents'
import {
  useToolsData,
  TopToolsChart,
  CategoryTreemap,
  DailyTrendChart,
  FailRateTrendChart,
  DetailsSection,
} from '@/features/tools'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { FilterBar } from '@/shared/components/filter-bar'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { AgentFilter } from '@/shared/components/agent-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useLocale } from '@/shared/lib/i18n'
import { formatDuration } from '@/shared/lib/format'

const DATE_OPTIONS = [
  { value: '7', labelKey: 'tools.date.7' },
  { value: '14', labelKey: 'tools.date.14' },
  { value: '30', labelKey: 'tools.date.30' },
  { value: '90', labelKey: 'tools.date.90' },
]

const formatNumber = (n: number): string => n.toLocaleString()

const formatPercent = (n: number): string => `${(n * 100).toFixed(1)}%`

export default function ToolsPage() {
  const { t } = useLocale()
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [days, setDays] = useState('7')

  const { tools, topTools, daily, individual, registered, kpi, loading } = useToolsData(agentType, days)

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
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
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t('tools.kpi.totalCalls')}
              value={kpi ? formatNumber(kpi.total_calls) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.successRate')}
              value={kpi ? formatPercent(kpi.success_rate) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.avgDuration')}
              value={kpi ? formatDuration(kpi.avg_duration_ms) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.uniqueTools')}
              value={kpi ? formatNumber(kpi.unique_tools) : '—'}
              loading={loading}
            />
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {loading ? (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <TopToolsChart data={topTools} />
                  <CategoryTreemap data={tools} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              {loading ? (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : individual.length === 0 && registered.length === 0 ? (
                <EmptyState title={t('tools.empty')} />
              ) : (
                <DetailsSection individual={individual} registered={registered} />
              )}
            </TabsContent>

            <TabsContent value="trends" className="mt-4 space-y-4">
              {loading ? (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : (
                <>
                  <DailyTrendChart data={daily} />
                  <FailRateTrendChart data={daily} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
