'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { DateRangePicker } from '@/components/date-range-picker'
import { AgentDot } from '@/components/ui/agent-dot'
import { AgentBadge } from '@/components/ui/agent-badge'
import { FilterBar } from '@/components/filter-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { SessionModelCostChart } from '@/components/session-model-cost-chart'
import { TraceWaterfall } from '@/components/trace-waterfall'
import type { SessionRow, SessionDetailEvent } from '@/lib/queries'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import { useLocale } from '@/lib/i18n'
import { dataClient } from '@/lib/data-client'

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

type SortOption = 'latest' | 'cost' | 'tokens'

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatCost = (value: number): string => `$${value.toFixed(3)}`

const formatDuration = (ms: number): string => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}

const shortenModel = (model: string): string => {
  return model
    .replace(/^claude-/, '')
    .replace(/^models\//, '')
    .replace(/-\d{8}$/, '')
}

const parseModels = (model: string): string[] => {
  if (!model) return ['unknown']
  return model.split(',').map((m) => m.trim()).filter(Boolean)
}

const formatTime = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatRelativeTime = (ts: string, tFn: (key: string) => string): string => {
  const now = Date.now()
  const then = new Date(ts).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}${tFn('sessions.reltime.sec')}`
  if (diff < 3600) return `${Math.floor(diff / 60)}${tFn('sessions.reltime.min')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)}${tFn('sessions.reltime.hour')}`
  return `${Math.floor(diff / 86400)}${tFn('sessions.reltime.day')}`
}

const computeCacheRate = (s: SessionRow): number => {
  const total = s.input_tokens + s.cache_read_tokens
  if (total === 0) return 0
  return Math.round((s.cache_read_tokens / total) * 100)
}

type PromptGroup = {
  promptId: string
  events: SessionDetailEvent[]
  cost: number
  startTime: string
}

const groupByPrompt = (events: SessionDetailEvent[]): PromptGroup[] => {
  const map = new Map<string, SessionDetailEvent[]>()
  const order: string[] = []

  for (const ev of events) {
    const key = ev.prompt_id || `_no_prompt_${ev.timestamp}`
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(ev)
  }

  return order.map((promptId) => {
    const evts = map.get(promptId)!
    return {
      promptId,
      events: evts,
      cost: evts.reduce((s, e) => s + (e.cost_usd || 0), 0),
      startTime: evts[0].timestamp,
    }
  })
}

const eventLabel = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return `API Request${ev.model ? ` · ${shortenModel(ev.model)}` : ''}`
    case 'tool_result':
      return `Tool: ${ev.tool_name || 'unknown'}${ev.tool_success === 0 ? ' [FAIL]' : ''}`
    case 'user_prompt':
      return 'User Prompt'
    case 'tool_decision':
      return `Tool Decision: ${ev.tool_name || 'unknown'}`
    case 'api_error':
      return 'API Error'
    default:
      return ev.event_name
  }
}

const eventDotColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'bg-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'bg-red-500' : 'bg-emerald-500'
    case 'user_prompt':
      return 'bg-violet-500'
    case 'api_error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const eventBgColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'border-l-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'border-l-red-500' : 'border-l-emerald-500'
    case 'user_prompt':
      return 'border-l-violet-500'
    case 'api_error':
      return 'border-l-red-500'
    default:
      return 'border-l-gray-300'
  }
}

type SessionSummary = {
  agentType: string
  model: string
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  wallTime: number
  requestCount: number
  toolCallCount: number
  cacheRate: number
}

const computeSummary = (events: SessionDetailEvent[], session: SessionRow): SessionSummary => {
  const apiEvents = events.filter((e) => e.event_name === 'api_request')
  const toolEvents = events.filter((e) => e.event_name === 'tool_result')
  const totalInput = apiEvents.reduce((s, e) => s + (e.input_tokens || 0), 0)
  const totalCache = apiEvents.reduce((s, e) => s + (e.cache_read_tokens || 0), 0)
  const cacheRate = (totalInput + totalCache) > 0
    ? Math.round((totalCache / (totalInput + totalCache)) * 100)
    : 0
  return {
    agentType: session.agent_type,
    model: session.model,
    totalCost: apiEvents.reduce((s, e) => s + (e.cost_usd || 0), 0),
    inputTokens: totalInput,
    outputTokens: apiEvents.reduce((s, e) => s + (e.output_tokens || 0), 0),
    cacheReadTokens: totalCache,
    wallTime: session.duration_ms,
    requestCount: apiEvents.length,
    toolCallCount: toolEvents.length,
    cacheRate,
  }
}

export default function SessionsPage() {
  const { t } = useLocale()
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: daysAgoISO(7), to: todayISO() })
  const [search, setSearch] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('latest')

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailEvents, setDetailEvents] = useState<SessionDetailEvent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelectedId(null)
    setDetailEvents([])
    dataClient.query('sessions', { agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((data) => {
        setSessions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setSessions([])
        setLoading(false)
      })
  }, [agentType, project, dateRange])

  const handleSelect = useCallback((sessionId: string) => {
    setSelectedId(sessionId)
    setDetailLoading(true)
    dataClient.query(`sessions/${encodeURIComponent(sessionId)}`)
      .then((data) => {
        setDetailEvents(Array.isArray(data) ? data : [])
        setDetailLoading(false)
      })
      .catch(() => {
        setDetailEvents([])
        setDetailLoading(false)
      })
  }, [])

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.session_id.toLowerCase().includes(q) ||
      s.project_name?.toLowerCase().includes(q) ||
      s.model?.toLowerCase().includes(q) ||
      s.agent_type.toLowerCase().includes(q)
    )
  })

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sortBy === 'cost') return b.cost - a.cost
    if (sortBy === 'tokens') return (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens)
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  })

  const selectedSession = sessions.find((s) => s.session_id === selectedId)
  const totalCost = sessions.reduce((s, r) => s + r.cost, 0)

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-2rem)] flex-col overflow-hidden">
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
        <div className="flex w-[35%] flex-col border-r">
          <div className="flex items-center justify-between border-b px-4 py-2">
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
                  <button
                    key={s.session_id}
                    type="button"
                    onClick={() => handleSelect(s.session_id)}
                    className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedId === s.session_id ? 'bg-muted ring-1 ring-inset ring-muted-foreground/20' : ''
                    }`}
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
                      <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums">
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
                      <span className="ml-auto shrink-0">{formatRelativeTime(s.started_at, t)}</span>
                    </div>
                  </button>
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

type SessionDetailProps = {
  session: SessionRow
  events: SessionDetailEvent[]
}

const SessionDetail = ({ session, events }: SessionDetailProps) => {
  const { t } = useLocale()
  const summary = computeSummary(events, session)
  const promptGroups = groupByPrompt(events)

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
      <div className="grid grid-cols-3 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-6">
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
        <Tabs defaultValue="list">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('sessions.detail.timeline')}</h3>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list">
            {promptGroups.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('sessions.detail.noEvents')}</div>
            ) : (
              <div className="space-y-2">
                {promptGroups.map((group, idx) => (
                  <PromptGroupCard key={group.promptId} group={group} index={idx} />
                ))}
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

type PromptGroupCardProps = {
  group: PromptGroup
  index: number
}

const PromptGroupCard = ({ group, index }: PromptGroupCardProps) => {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/30"
      >
        <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
        <span className="text-xs text-muted-foreground">{formatTime(group.startTime)}</span>
        <span className="text-xs text-muted-foreground">
          ({group.events.length}{t('sessions.promptGroup.events')})
        </span>
        <span className="ml-auto shrink-0 text-xs font-medium tabular-nums">
          {formatCost(group.cost)}
        </span>
        <span className="text-muted-foreground">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="border-t">
          {group.events.map((ev, i) => (
            <div
              key={`${ev.timestamp}-${i}`}
              className={`flex items-start gap-3 border-b border-l-2 px-4 py-2 text-xs last:border-b-0 ${eventBgColor(ev)}`}
            >
              <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${eventDotColor(ev)}`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{eventLabel(ev)}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                  <span>{formatTime(ev.timestamp)}</span>
                  {ev.event_name === 'api_request' && (
                    <>
                      <span>in: {formatTokens(ev.input_tokens)}</span>
                      <span>out: {formatTokens(ev.output_tokens)}</span>
                      {ev.cache_read_tokens > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          cache: {formatTokens(ev.cache_read_tokens)}
                        </span>
                      )}
                      <span className="font-medium">{formatCost(ev.cost_usd)}</span>
                    </>
                  )}
                  {ev.duration_ms > 0 && <span>{formatDuration(ev.duration_ms)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
