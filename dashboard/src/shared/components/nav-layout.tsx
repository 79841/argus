'use client'

import { useState, useEffect } from 'react'

import { PanelLeft } from 'lucide-react'
import { Nav } from '@/shared/components/nav'
import { BottomBar } from '@/shared/components/bottom-bar'
import { WindowControls } from '@/shared/components/window-controls'
import { TopBarPortalProvider, useTopBarPortal } from '@/shared/components/top-bar-portal'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { STORAGE_KEYS } from '@/shared/lib/constants'
import { useLocale } from '@/shared/lib/i18n'

type TopBarProps = {
  onToggleNav: () => void
}

const TopBar = ({ onToggleNav }: TopBarProps) => {
  const { setTarget } = useTopBarPortal()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [platform, setPlatform] = useState<'mac' | 'windows' | 'web'>('web')
  const { t } = useLocale()

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
        'flex h-[52px] flex-shrink-0 items-center',
        isMacInset ? 'pl-20' : ''
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {platform === 'windows' && (
        <span className="pl-3 text-xs font-bold tracking-tight text-muted-foreground/30 select-none">Argus</span>
      )}

      <div className="flex w-14 shrink-0 items-center justify-center">
        <Tooltip>
          <TooltipTrigger
            onClick={onToggleNav}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors [-webkit-app-region:no-drag]"
          >
            <PanelLeft className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('shared.navLayout.toggleSidebar')}</TooltipContent>
        </Tooltip>
      </div>

      <div ref={setTarget} className="flex flex-1 flex-wrap items-center gap-3 px-2" />

      {platform !== 'windows' && (
        <span className="text-xs font-bold tracking-tight text-muted-foreground/30 select-none px-3">Argus</span>
      )}

      <WindowControls />
    </div>
  )
}

const LayoutInner = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NAV_COLLAPSED)
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
      localStorage.setItem(STORAGE_KEYS.NAV_COLLAPSED, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
    } catch {}
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--bg-sunken)]">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true" style={{ contain: 'layout paint' }}>
        <div
          className="absolute -top-[20%] -left-[15%] h-[60%] w-[60%] rounded-full opacity-40 blur-[120px] blob-animate"
          style={{ background: 'var(--blob-primary)' }}
        />
        <div
          className="absolute -right-[15%] -bottom-[20%] h-[50%] w-[50%] rounded-full opacity-30 blur-[100px] blob-animate-reverse"
          style={{ background: 'var(--blob-gemini)' }}
        />
        <div
          className="absolute top-[30%] left-[50%] h-[40%] w-[40%] -translate-x-1/2 rounded-full opacity-20 blur-[80px] blob-animate-slow"
          style={{ background: 'var(--blob-codex)' }}
        />
      </div>
      <TopBar onToggleNav={toggleNav} />
      <div className="flex flex-1 min-h-0 gap-0">
        <Nav />
        <main className="flex flex-1 flex-col overflow-hidden rounded-tl-2xl glass">
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
