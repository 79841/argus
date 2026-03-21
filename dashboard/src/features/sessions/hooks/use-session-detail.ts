'use client'

import { useState, useEffect } from 'react'
import { sessionsService } from '@/shared/services'
import type { SessionDetailEvent, SessionSummary } from '@/lib/queries'

export type PromptGroup = {
  promptId: string
  events: SessionDetailEvent[]
  cost: number
  toolCount: number
  startTime: string
}

const TIMELINE_EVENTS = new Set([
  'user_prompt', 'api_request', 'api_error', 'tool_result', 'tool_decision',
])

export const groupByPrompt = (events: SessionDetailEvent[]): PromptGroup[] => {
  const map = new Map<string, SessionDetailEvent[]>()
  const order: string[] = []

  for (const ev of events) {
    if (!ev.prompt_id && !TIMELINE_EVENTS.has(ev.event_name)) continue
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
      toolCount: evts.filter((e) => e.event_name === 'tool_result').length,
      startTime: evts[0].timestamp,
    }
  })
}

type UseSessionDetailReturn = {
  loading: boolean
  summary: SessionSummary | null
  events: SessionDetailEvent[]
  promptGroups: PromptGroup[]
  cacheRate: number
  costChartData: { label: string; cost: number; toolCount: number }[]
}

export const useSessionDetail = (sessionId: string): UseSessionDetailReturn => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [events, setEvents] = useState<SessionDetailEvent[]>([])

  useEffect(() => {
    if (!sessionId) return

    setLoading(true)
    sessionsService.getSessionDetail(sessionId, { summary: 'true' })
      .then((data) => {
        const d = data as { summary: SessionSummary | null; events: SessionDetailEvent[] }
        setSummary(d.summary ?? null)
        setEvents(Array.isArray(d.events) ? d.events : [])
        setLoading(false)
      })
      .catch(() => {
        setSummary(null)
        setEvents([])
        setLoading(false)
      })
  }, [sessionId])

  const promptGroups = groupByPrompt(events)

  const costChartData = promptGroups.map((g, i) => ({
    label: `#${i + 1}`,
    cost: g.cost,
    toolCount: g.toolCount,
  }))

  const cacheRate = summary
    ? Math.round(
        (summary.input_tokens + summary.cache_read_tokens) > 0
          ? (summary.cache_read_tokens / (summary.input_tokens + summary.cache_read_tokens)) * 100
          : 0
      )
    : 0

  return {
    loading,
    summary,
    events,
    promptGroups,
    cacheRate,
    costChartData,
  }
}
