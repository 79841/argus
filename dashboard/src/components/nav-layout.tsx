'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLeft } from 'lucide-react'
import { Nav } from '@/components/nav'
import { BottomBar } from '@/components/bottom-bar'
import { WindowControls } from '@/components/window-controls'
import { TopBarPortalProvider, useTopBarPortal } from '@/components/top-bar-portal'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV_STORAGE_KEY = 'argus-nav-collapsed'

type TopBarProps = {
  onToggleNav: () => void
}

const TopBar = ({ onToggleNav }: TopBarProps) => {
  const { setTarget } = useTopBarPortal()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [platform, setPlatform] = useState<'mac' | 'windows' | 'web'>('web')

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    if (api.platform === 'darwin') {
      setPlatform('mac')
      const cleanup = api.onFullScreenChange?.((fs) => setIsFullScreen(fs))
      return () => { cleanup?.() }
    } else if (api.platform === 'win32') {
      setPlatform('windows')
    }
  }, [])

  const isMacInset = platform === 'mac' && !isFullScreen

  return (
    <div
      className={cn(
        'flex h-[52px] flex-shrink-0 items-center gap-2 px-2',
        isMacInset ? 'pl-20' : 'pl-2'
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {platform === 'windows' && (
        <span className="text-xs font-bold tracking-tight text-muted-foreground/30 select-none mr-1">Argus</span>
      )}

      <Tooltip>
        <TooltipTrigger
          onClick={onToggleNav}
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors [-webkit-app-region:no-drag]"
        >
          <PanelLeft className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">Toggle sidebar</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-[var(--border-subtle)]" />

      <div ref={setTarget} className="flex flex-1 flex-wrap items-center gap-3" />

      {platform !== 'windows' && (
        <span className="text-xs font-bold tracking-tight text-muted-foreground/30 select-none ml-2">Argus</span>
      )}

      <WindowControls />
    </div>
  )
}

const LayoutInner = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAV_STORAGE_KEY)
      if (stored !== null) setCollapsed(JSON.parse(stored))
    } catch {}

    const handler = (e: Event) => setCollapsed((e as CustomEvent<boolean>).detail)
    window.addEventListener('argus-nav-toggle', handler)
    return () => window.removeEventListener('argus-nav-toggle', handler)
  }, [])

  const toggleNav = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
    } catch {}
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-sunken)]">
      <TopBar onToggleNav={toggleNav} />
      <div className="flex flex-1 min-h-0 gap-0">
        <Nav />
        <main className="flex flex-1 flex-col overflow-hidden rounded-tl-xl bg-[var(--bg-base)]">
          {children}
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

export const NavLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <TopBarPortalProvider>
      <LayoutInner>{children}</LayoutInner>
    </TopBarPortalProvider>
  )
}
