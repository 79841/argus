'use client'

import { useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'argus-auto-refresh'

const getIntervalFromStorage = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return 0
    const parsed = Number(stored)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

export const useAutoRefresh = (callback: () => void, overrideMs?: number) => {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const intervalMs = overrideMs ?? getIntervalFromStorage()

  useEffect(() => {
    if (intervalMs <= 0) return

    const id = setInterval(() => {
      callbackRef.current()
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs])
}
