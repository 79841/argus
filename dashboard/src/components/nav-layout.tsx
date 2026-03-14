'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/nav'
import { TopBar } from '@/components/top-bar'
import { BottomBar } from '@/components/bottom-bar'
import { RightSidebar } from '@/components/right-sidebar'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'argus-nav-collapsed'

export const NavLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setCollapsed(JSON.parse(stored))
      }
    } catch {
      // ignore
    }

    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail
      setCollapsed(detail)
    }
    window.addEventListener('argus-nav-toggle', handleToggle)
    return () => window.removeEventListener('argus-nav-toggle', handleToggle)
  }, [])

  return (
    <>
      <Nav />
      <div
        className={cn(
          'flex h-screen flex-col transition-[margin-left] duration-200',
          collapsed ? 'ml-14' : 'ml-52'
        )}
      >
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <main className="flex-1 overflow-auto px-6 py-6">
            {children}
          </main>
          <RightSidebar />
        </div>
        <BottomBar />
      </div>
    </>
  )
}
