'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'

export const PipTitlebar = () => {
  const { t } = useLocale()
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined)
  }, [])

  if (!isElectron) return null

  return (
    <div
      className="flex h-7 w-full shrink-0 items-center justify-between bg-gray-900 px-3 [-webkit-app-region:drag]"
    >
      <span className="text-xs font-medium text-gray-400 select-none">
        {t('pip.titlebar.title')}
      </span>
      <button
        onClick={() => window.electronAPI?.pip?.close()}
        className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:bg-red-500/80 hover:text-white [-webkit-app-region:no-drag]"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
