'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { SessionRow } from '@/lib/queries'
import type { SessionDetailEvent } from '@/lib/queries'
import { useTopBar } from '@/components/top-bar-context'

const AGENT_DOT_CLASSES: Record<string, string> = {
  codex: 'bg-emerald-500',
  claude: 'bg-orange-500',
  gemini: 'bg-blue-500',
}

const AGENT_BADGE_CLASSES: Record<string, string> = {
  codex: 'bg-emerald-500 text-white',
  claude: 'bg-orange-500 text-white',
  gemini: 'bg-blue-500 text-white',
}

type SortOption = 'latest' | 'cost'

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

const formatTime = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatDate = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
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
      return `API Request${ev.model ? ` (${ev.model})` : ''}`
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

type SessionSummary = {
  agentType: string
  model: string
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  wallTime: number
  requestCount: number
}

const computeSummary = (events: SessionDetailEvent[], session: SessionRow): SessionSummary => {
  const apiEvents = events.filter((e) => e.event_name === 'api_request')
  return {
    agentType: session.agent_type,
    model: session.model,
    totalCost: apiEvents.reduce((s, e) => s + (e.cost_usd || 0), 0),
    inputTokens: apiEvents.reduce((s, e) => s + (e.input_tokens || 0), 0),
    outputTokens: apiEvents.reduce((s, e) => s + (e.output_tokens || 0), 0),
    cacheReadTokens: apiEvents.reduce((s, e) => s + (e.cache_read_tokens || 0), 0),
    wallTime: session.duration_ms,
    requestCount: apiEvents.length,
  }
}

export default function SessionsPage() {
  const { agentType, project, dateRange } = useTopBar()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailEvents, setDetailEvents] = useState<SessionDetailEvent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('latest')

  useEffect(() => {
    setLoading(true)
    setSelectedId(null)
    setDetailEvents([])
    const q = `agent_type=${agentType}&project=${project}&from=${dateRange.from}&to=${dateRange.to}`
    fetch(`/api/sessions?${q}`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data)
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
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        setDetailEvents(data)
        setDetailLoading(false)
      })
      .catch(() => {
        setDetailEvents([])
        setDetailLoading(false)
      })
  }, [])

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'cost') return b.cost - a.cost
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  })

  const selectedSession = sessions.find((s) => s.session_id === selectedId)
  const totalCost = sessions.reduce((s, r) => s + r.cost, 0)

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Left Panel: Session List */}
        <div className="flex w-[35%] flex-col border-r">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="text-sm font-semibold">Sessions</h2>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : sortedSessions.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                No sessions found
              </div>
            ) : (
              sortedSessions.map((s) => (
                <button
                  key={s.session_id}
                  type="button"
                  onClick={() => handleSelect(s.session_id)}
                  className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    selectedId === s.session_id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${AGENT_DOT_CLASSES[s.agent_type] ?? 'bg-violet-500'}`} />
                    <span className="truncate text-sm font-medium">{s.model || 'unknown'}</span>
                    <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums">
                      {formatCost(s.cost)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDuration(s.duration_ms)}</span>
                    <span className="text-border">|</span>
                    <span className="truncate">{s.project_name || 'no project'}</span>
                    <span className="ml-auto shrink-0">{formatDate(s.started_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Session Detail */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a session to view details
            </div>
          ) : detailLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading session detail...
            </div>
          ) : selectedSession ? (
            <SessionDetail session={selectedSession} events={detailEvents} />
          ) : null}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex h-8 items-center border-t bg-muted/30 px-4 text-xs text-muted-foreground">
        <span>{sessions.length} sessions</span>
        <span className="mx-2 text-border">|</span>
        <span>Total {formatCost(totalCost)}</span>
      </div>
    </div>
  )
}

type SessionDetailProps = {
  session: SessionRow
  events: SessionDetailEvent[]
}

const SessionDetail = ({ session, events }: SessionDetailProps) => {
  const summary = computeSummary(events, session)
  const promptGroups = groupByPrompt(events)

  return (
    <div className="space-y-6 p-6">
      {/* Summary */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge className={AGENT_BADGE_CLASSES[summary.agentType] ?? 'bg-violet-500 text-white'}>
            {summary.agentType}
          </Badge>
          <span className="text-sm text-muted-foreground">{summary.model}</span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {session.session_id.slice(0, 12)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-lg border p-4 text-sm md:grid-cols-6">
          <div>
            <div className="text-xs text-muted-foreground">Cost</div>
            <div className="font-semibold tabular-nums">{formatCost(summary.totalCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Input</div>
            <div className="font-semibold tabular-nums">{formatTokens(summary.inputTokens)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Output</div>
            <div className="font-semibold tabular-nums">{formatTokens(summary.outputTokens)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cache</div>
            <div className="font-semibold tabular-nums">{formatTokens(summary.cacheReadTokens)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Wall Time</div>
            <div className="font-semibold tabular-nums">{formatDuration(summary.wallTime)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Requests</div>
            <div className="font-semibold tabular-nums">{summary.requestCount}</div>
          </div>
        </div>
      </div>

      {/* Prompt Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Prompt Timeline</h3>
        {promptGroups.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No events</div>
        ) : (
          <div className="space-y-3">
            {promptGroups.map((group, idx) => (
              <PromptGroupCard key={group.promptId} group={group} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type PromptGroupCardProps = {
  group: PromptGroup
  index: number
}

const PromptGroupCard = ({ group, index }: PromptGroupCardProps) => {
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
          ({group.events.length} events)
        </span>
        <span className="ml-auto shrink-0 text-xs font-medium tabular-nums">
          {formatCost(group.cost)}
        </span>
        <span className="text-muted-foreground">{expanded ? '\u25B4' : '\u25BE'}</span>
      </button>

      {expanded && (
        <div className="border-t">
          {group.events.map((ev, i) => (
            <div
              key={`${ev.timestamp}-${i}`}
              className="flex items-start gap-3 border-b px-4 py-2 text-xs last:border-b-0"
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
                      {ev.cache_read_tokens > 0 && <span>cache: {formatTokens(ev.cache_read_tokens)}</span>}
                      <span>{formatCost(ev.cost_usd)}</span>
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
