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

  if (collapsed) {
    return (
      <aside className="relative shrink-0 border-l bg-background w-8">
        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
          aria-label="Open sidebar"
        >
          &laquo;
        </button>
      </aside>
    )
  }

  return (
    <aside className="relative shrink-0 border-l bg-background w-64">
      <div className="flex h-8 items-center justify-end border-b px-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            'text-sm text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          aria-label="Close sidebar"
        >
          &raquo;
        </button>
      </div>
      <div className="p-4 text-sm text-muted-foreground">
        Coming soon
      </div>
    </aside>
  )
}
