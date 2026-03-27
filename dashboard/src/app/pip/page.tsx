'use client'

import { useState, useEffect } from 'react'
import { HeartbeatChart, PipTitlebar, SessionToastContainer } from '@/features/pip'
import { useLocale } from '@/shared/lib/i18n'

const useCurrentTime = () => {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

export default function PipPage() {
  const { t } = useLocale()
  const currentTime = useCurrentTime()

  return (
    <div className="flex flex-col w-screen h-screen bg-gray-950">
      <PipTitlebar />
      <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-sm font-semibold text-gray-200 tracking-wide">
            {t('pip.heartbeat.title')}
          </h1>
          <span className="text-xs text-gray-500 tabular-nums">{currentTime}</span>
        </div>
        <div className="flex-1 min-h-0">
          <HeartbeatChart minutes={5} />
        </div>
      </div>
      <SessionToastContainer />
    </div>
  )
}
