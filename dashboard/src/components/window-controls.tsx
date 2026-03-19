'use client'

import { useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'

export const WindowControls = () => {
  const [isWindows, setIsWindows] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (api && api.platform === 'win32') setIsWindows(true)
  }, [])

  if (!isWindows) return null

  const minimize = () => window.electronAPI?.windowControl?.minimize()
  const maximize = () => window.electronAPI?.windowControl?.maximize()
  const close = () => window.electronAPI?.windowControl?.close()

  return (
    <div className="ml-auto flex items-center [-webkit-app-region:no-drag]">
      <button
        onClick={minimize}
        className="inline-flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        onClick={maximize}
        className="inline-flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Square className="size-3" />
      </button>
      <button
        onClick={close}
        className="inline-flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
