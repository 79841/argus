'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SessionSummary } from '../lib/session-completion'

const MAX_NOTIFICATIONS = 3
const AUTO_DISMISS_MS = 5_000

export type Notification = {
  id: string
  summary: SessionSummary
  createdAt: number
}

type UseNotificationQueueReturn = {
  notifications: Notification[]
  addNotification: (summary: SessionSummary) => void
  removeNotification: (id: string) => void
}

export const useNotificationQueue = (): UseNotificationQueueReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeNotification = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (summary: SessionSummary) => {
      const id = `${summary.agentType}-${Date.now()}`
      const notification: Notification = { id, summary, createdAt: Date.now() }

      setNotifications((prev) => {
        const next = [...prev, notification]
        return next.length > MAX_NOTIFICATIONS ? next.slice(next.length - MAX_NOTIFICATIONS) : next
      })

      const timer = setTimeout(() => removeNotification(id), AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
    },
    [removeNotification]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return { notifications, addNotification, removeNotification }
}
