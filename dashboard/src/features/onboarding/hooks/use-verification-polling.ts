'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { POLLING } from '@/shared/lib/constants'

export const useVerificationPolling = () => {
  const [verified, setVerified] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/status')
      const data = await res.json()
      if (data.hasData) {
        setVerified(true)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(poll, POLLING.VERIFICATION_MS)
    poll()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [poll])

  const triggerSeed = useCallback(async () => {
    setSeeding(true)
    try {
      await fetch('/api/seed', { method: 'POST' })
      await poll()
    } catch {
      // ignore
    } finally {
      setSeeding(false)
    }
  }, [poll])

  return { verified, seeding, triggerSeed }
}
