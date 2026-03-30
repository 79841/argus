'use client'

import { useParams } from 'next/navigation'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select'
import { AgentFilter } from '@/shared/components/agent-filter'
import { DateRangePicker } from '@/shared/components/date-range-picker'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { SessionDetail } from '@/features/sessions/components/session-detail'
import type { SortOption } from '@/shared/types/common'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, computeCacheRate } from '@/shared/lib/format'
import { useSessions, SessionListItem } from '@/features/sessions'
import { useIsMobile } from '@/shared/hooks/use-media-query'

export default function ProjectSessionsPage() {
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)
  const { t } = useLocale()
  const isMobile = useIsMobile()

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
    setSelectedId,
    handleSelect,
  } = useSessions({ initialProject: projectName })

  const showDetail = isMobile ? !!selectedId : true
  const showList = isMobile ? !selectedId : true

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2">
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

      <div className="flex min-h-0 flex-1">
        {showList && (
          <div className="flex w-full md:w-[35%] flex-col">
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
        )}

        {showDetail && (
          <div className="flex w-full md:flex-1 flex-col overflow-y-auto scrollbar-hide">
            {isMobile && selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('sessions.backToList')}
              </button>
            )}
            {!selectedId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <EmptyState title={t('sessions.detail.placeholder')} />
              </div>
            ) : detailLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {t('sessions.loading')}
              </div>
            ) : selectedSession ? (
              <SessionDetail session={selectedSession} events={detailEvents} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
