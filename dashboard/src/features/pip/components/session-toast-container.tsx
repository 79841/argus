'use client'

import { useCallback } from 'react'
import { useSessionCompletion } from '../hooks/use-session-completion'
import { sendSystemNotification } from '../lib/electron-notification'
import { formatNotificationText } from '../lib/session-completion'
import { useLocale } from '@/shared/lib/i18n'
import type { SessionSummary } from '../lib/session-completion'

export const SessionToastContainer = () => {
  const { t } = useLocale()

  const handleComplete = useCallback(
    (summary: SessionSummary) => {
      const { title, body } = formatNotificationText(summary, t)
      sendSystemNotification(title, body)
    },
    [t]
  )

  useSessionCompletion({ onComplete: handleComplete })

  return null
}
