'use client'

import { useCallback } from 'react'
import { useNotificationQueue } from '../hooks/use-notification-queue'
import { useSessionCompletion } from '../hooks/use-session-completion'
import { sendSystemNotification } from '../lib/electron-notification'
import { formatNotificationText } from '../lib/session-completion'
import { SessionToast } from './session-toast'
import { useLocale } from '@/shared/lib/i18n'
import type { SessionSummary } from '../lib/session-completion'

export const SessionToastContainer = () => {
  const { t } = useLocale()
  const { notifications, addNotification, removeNotification } = useNotificationQueue()

  const handleComplete = useCallback(
    (summary: SessionSummary) => {
      addNotification(summary)
      const { title, body } = formatNotificationText(summary, t)
      sendSystemNotification(title, body)
    },
    [addNotification, t]
  )

  useSessionCompletion({ onComplete: handleComplete })

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {notifications.map((n) => (
        <SessionToast
          key={n.id}
          summary={n.summary}
          onClose={() => removeNotification(n.id)}
        />
      ))}
    </div>
  )
}
