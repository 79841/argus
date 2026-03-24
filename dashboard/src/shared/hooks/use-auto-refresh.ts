'use client'

import { useEffect, useRef } from 'react'
import { STORAGE_KEYS } from '@/shared/lib/constants'

const getIntervalFromStorage = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH)
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
