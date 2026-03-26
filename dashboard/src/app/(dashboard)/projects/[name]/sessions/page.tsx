'use client'

import { useParams } from 'next/navigation'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select'
import { AgentFilter } from '@/shared/components/agent-filter'
import { DateRangePicker } from '@/shared/components/date-range-picker'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { SessionPreview } from '@/features/sessions/components/session-preview'
import type { SortOption } from '@/shared/types/common'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, computeCacheRate } from '@/shared/lib/format'
import { useSessions, SessionListItem } from '@/features/sessions'

export default function ProjectSessionsPage() {
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)
  const { t } = useLocale()

  const {
    loading,
    selectedId,
    selectedSession,
    detailEvents,
    detailLoading,
    agentType,
    dateRange,
    search,
    sortBy,
    sortedSessions,
    totalCost,
    setAgentType,
    setDateRange,
    setSearch,
    setSortBy,
    handleSelect,
  } = useSessions({ initialProject: projectName })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2">
        <AgentFilter value={agentType} onChange={setAgentType} />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex flex-1 items-center gap-2 min-w-[180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sessions.search.placeholder')}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[120px] text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">{t('sessions.sort.latest')}</SelectItem>
            <SelectItem value="cost">{t('sessions.sort.cost')}</SelectItem>
            <SelectItem value="tokens">{t('sessions.sort.tokens')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Left Panel: Session List (35%) */}
        <div className="flex w-[35%] flex-col border-r border-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {loading ? t('sessions.loading') : `${sortedSessions.length}${t('sessions.count')}`}
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {t('sessions.total')}{formatCost(totalCost)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                {t('sessions.loading')}
              </div>
            ) : sortedSessions.length === 0 ? (
              <EmptyState title={t('sessions.empty')} />
            ) : (
              sortedSessions.map((s) => (
                <SessionListItem
                  key={s.session_id}
                  session={s}
                  selected={selectedId === s.session_id}
                  cacheRate={Math.round(computeCacheRate(s.input_tokens, s.cache_read_tokens))}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Session Detail (65%) */}
        <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-30"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-sm">{t('sessions.detail.placeholder')}</span>
            </div>
          ) : selectedSession ? (
            <SessionPreview session={selectedSession} events={detailEvents} loading={detailLoading} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
