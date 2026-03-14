'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'argus-right-sidebar-collapsed'

export const RightSidebar = () => {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <aside
      className={cn(
        'relative shrink-0 border-l bg-background transition-[width] duration-200',
        collapsed ? 'w-0 overflow-hidden' : 'w-64'
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="absolute -left-6 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground hover:text-foreground"
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {collapsed ? '\u2039' : '\u203A'}
      </button>
      {!collapsed && (
        <div className="p-4 text-sm text-muted-foreground">
          Coming soon
        </div>
      )}
    </aside>
  )
}
