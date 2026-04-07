'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { agentsService } from '@/shared/services/agents-service'
import type { AgentsApiResponse } from '@/app/api/agents/route'
import type { AgentProject } from '@/shared/lib/queries'

const POLL_INTERVAL_MS = 3_000

type UseAgentsLiveReturn = {
  projects: AgentProject[]
  activeCount: number
  isLoading: boolean
}

const dataEqual = (a: AgentsApiResponse, b: AgentsApiResponse): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export const useAgentsLive = (): UseAgentsLiveReturn => {
  const [data, setData] = useState<AgentsApiResponse>({ projects: [] })
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevRef = useRef<AgentsApiResponse>({ projects: [] })

  const fetchData = useCallback(async (showLoading: boolean) => {
    if (showLoading) setIsLoading(true)
    try {
      const next = await agentsService.getLive()
      if (!dataEqual(prevRef.current, next)) {
        prevRef.current = next
        setData(next)
      }
    } catch {
      // network error — skip update
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)
    timerRef.current = setInterval(() => fetchData(false), POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchData])

  const activeCount = useMemo(
    () => data.projects.reduce((sum, p) => sum + p.sessions.length, 0),
    [data.projects],
  )

  return { projects: data.projects, activeCount, isLoading }
}
