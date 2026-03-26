'use client'

import { useEffect, useRef } from 'react'
import { POLLING } from '@/shared/lib/constants'
import { detectCompletedSessions, buildSessionSummary } from '../lib/session-completion'
import type { ActiveSessionInfo } from '@/shared/types/api'
import type { SessionSummary } from '../lib/session-completion'

type UseSessionCompletionOptions = {
  onComplete: (summary: SessionSummary) => void
}

export const useSessionCompletion = ({ onComplete }: UseSessionCompletionOptions): void => {
  const prevSessionsRef = useRef<ActiveSessionInfo[] | undefined>(undefined)

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await fetch('/api/sessions/active')
        if (!res.ok) return
        const data = await res.json() as { sessions?: ActiveSessionInfo[] }
        const currSessions = data.sessions ?? []

        const completed = detectCompletedSessions(prevSessionsRef.current, currSessions)
        completed.forEach((session) => {
          onComplete(buildSessionSummary(session))
        })

        prevSessionsRef.current = currSessions
      } catch {
        // best-effort
      }
    }

    fetchActive()
    const id = setInterval(fetchActive, POLLING.ACTIVE_SESSION_MS)
    return () => clearInterval(id)
  }, [onComplete])
}
