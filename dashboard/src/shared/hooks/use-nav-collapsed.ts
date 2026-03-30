'use client'

import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '@/shared/lib/constants'

export const useNavCollapsed = (): [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NAV_COLLAPSED)
      if (stored !== null) setCollapsed(JSON.parse(stored))
    } catch {}

    const handler = (e: Event) => setCollapsed((e as CustomEvent<boolean>).detail)
    window.addEventListener('argus-nav-toggle', handler)
    return () => window.removeEventListener('argus-nav-toggle', handler)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEYS.NAV_COLLAPSED, JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
      } catch {}
      return next
    })
  }, [])

  return [collapsed, toggle]
}
