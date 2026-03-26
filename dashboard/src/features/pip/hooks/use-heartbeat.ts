'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { transformHeartbeat } from '../lib/transform'
import type { ChartDataPoint, HeartbeatRaw } from '../lib/transform'

const POLL_INTERVAL_MS = 5_000

type HeartbeatResponse = {
  data: HeartbeatRaw[]
  minutes: number
  agent_type: string
}

type UseHeartbeatReturn = {
  data: ChartDataPoint[]
  isLoading: boolean
}

const dataEqual = (a: ChartDataPoint[], b: ChartDataPoint[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].claude !== b[i].claude || a[i].codex !== b[i].codex || a[i].gemini !== b[i].gemini) return false
  }
  return true
}

export const useHeartbeat = (minutes = 5): UseHeartbeatReturn => {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async (showLoading: boolean) => {
    if (showLoading) setIsLoading(true)
    try {
      const res = await fetch(`/api/heartbeat?minutes=${minutes}`)
      if (!res.ok) return
      const json = (await res.json()) as HeartbeatResponse
      const next = transformHeartbeat(json.data, minutes)
      setData((prev) => (dataEqual(prev, next) ? prev : next))
    } catch {
      // network error — skip update
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [minutes])

  useEffect(() => {
    fetchData(true)
    timerRef.current = setInterval(() => fetchData(false), POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchData])

  return { data, isLoading }
}
