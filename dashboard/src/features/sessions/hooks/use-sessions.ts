'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { sessionsService } from '@/shared/services'
import type { SessionRow, SessionDetailEvent } from '@/lib/queries'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import type { SortOption } from '@/types/common'

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

const computeCacheRate = (s: SessionRow): number => {
  const total = s.input_tokens + s.cache_read_tokens
  if (total === 0) return 0
  return Math.round((s.cache_read_tokens / total) * 100)
}

type UseSessionsReturn = {
  sessions: SessionRow[]
  loading: boolean
  selectedId: string | null
  selectedSession: SessionRow | undefined
  detailEvents: SessionDetailEvent[]
  detailLoading: boolean
  agentType: AgentType
  project: string
  dateRange: DateRange
  search: string
  sortBy: SortOption
  sortedSessions: SessionRow[]
  totalCost: number
  setAgentType: (v: AgentType) => void
  setProject: (v: string) => void
  setDateRange: (v: DateRange) => void
  setSearch: (v: string) => void
  setSortBy: (v: SortOption) => void
  handleSelect: (sessionId: string) => void
  computeCacheRate: (s: SessionRow) => number
}

export const useSessions = (): UseSessionsReturn => {
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
    sessionsService.getSessions({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
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
    sessionsService.getSessionDetail(sessionId)
      .then((data) => {
        setDetailEvents(Array.isArray(data) ? data : [])
        setDetailLoading(false)
      })
      .catch(() => {
        setDetailEvents([])
        setDetailLoading(false)
      })
  }, [])

  const sortedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        s.session_id.toLowerCase().includes(q) ||
        s.project_name?.toLowerCase().includes(q) ||
        s.model?.toLowerCase().includes(q) ||
        s.agent_type.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      if (sortBy === 'cost') return b.cost - a.cost
      if (sortBy === 'tokens') return (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens)
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })
  }, [sessions, search, sortBy])

  const selectedSession = useMemo(() => sessions.find((s) => s.session_id === selectedId), [sessions, selectedId])
  const totalCost = useMemo(() => sessions.reduce((s, r) => s + r.cost, 0), [sessions])

  return {
    sessions,
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
  }
}
