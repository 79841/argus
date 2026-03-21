'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { DateRangePicker } from '@/components/date-range-picker'
import { AgentDot } from '@/components/ui/agent-dot'
import { FilterBar } from '@/components/filter-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { SessionDetail } from '@/components/session-detail'
import type { AgentType } from '@/lib/agents'
import type { SortOption } from '@/types/common'
import { useLocale } from '@/lib/i18n'
import { formatCost, formatTokens, formatDuration, shortenModel, parseModels } from '@/lib/format'
import { formatRelativeTime } from '@/shared/lib/format'
import { useSessions } from '@/features/sessions'

export default function SessionsPage() {
  const { t } = useLocale()
  const {
    loading,
    selectedId,
    selectedSession,
    detailEvents,
    detailLoading,
    agentType,
    project,
    dateRange,
    search,
    sortBy,
    sortedSessions,
    totalCost,
    setAgentType,
    setProject,
    setDateRange,
    setSearch,
    setSortBy,
    handleSelect,
    computeCacheRate,
  } = useSessions()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filter Bar */}
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <ProjectFilter value={project} onChange={setProject} />
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
      </FilterBar>

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

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                {t('sessions.loading')}
              </div>
            ) : sortedSessions.length === 0 ? (
              <EmptyState title={t('sessions.empty')} />
            ) : (
              sortedSessions.map((s) => {
                const cacheRate = computeCacheRate(s)
                return (
                  <div
                    key={s.session_id}
                    className={`group relative border-b border-[var(--border-subtle)] transition-colors hover:bg-muted/50 ${
                      selectedId === s.session_id ? 'bg-muted ring-1 ring-inset ring-muted-foreground/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(s.session_id)}
                      className="w-full px-4 py-3 text-left"
                    >
                      {/* Row 1: agent dot + models + cost */}
                      <div className="flex items-center gap-2">
                        <AgentDot agent={s.agent_type as AgentType} size="md" />
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                          {parseModels(s.model).map((m) => (
                            <Badge key={m} variant="secondary" className="text-xs font-medium">
                              {shortenModel(m)}
                            </Badge>
                          ))}
                        </div>
                        <span className="mr-6 ml-auto shrink-0 text-sm font-semibold tabular-nums">
                          {formatCost(s.cost)}
                        </span>
                      </div>
                      {/* Row 2: project + duration */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate max-w-[120px]">{s.project_name || 'no project'}</span>
                        <span className="text-border">·</span>
                        <span>{formatDuration(s.duration_ms)}</span>
                      </div>
                      {/* Row 3: tokens + cache rate + relative time */}
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatTokens(s.input_tokens + s.output_tokens)} tok</span>
                        {cacheRate > 0 && (
                          <>
                            <span className="text-border">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{t('sessions.cache')}{cacheRate}%</span>
                          </>
                        )}
                        <span className="ml-auto shrink-0">{formatRelativeTime(s.last_activity || s.started_at, t)}</span>
                      </div>
                    </button>
                    {/* External link to detail page */}
                    <Link
                      href={`/sessions/${encodeURIComponent(s.session_id)}`}
                      title={t('sessions.detail.openDetail')}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    </Link>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Panel: Session Detail (65%) */}
        <div className="flex flex-1 flex-col overflow-y-auto">
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
          ) : detailLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {t('sessions.detail.loading')}
            </div>
          ) : selectedSession ? (
            <SessionDetail session={selectedSession} events={detailEvents} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
