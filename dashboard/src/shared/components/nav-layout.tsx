'use client'

import { useState, useEffect } from 'react'

import { Menu, PanelLeft } from 'lucide-react'
import { Nav } from '@/shared/components/nav'
import { BottomBar } from '@/shared/components/bottom-bar'
import { WindowControls } from '@/shared/components/window-controls'
import { TopBarPortalProvider, useTopBarPortal } from '@/shared/components/top-bar-portal'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { STORAGE_KEYS } from '@/shared/lib/constants'
import { useLocale } from '@/shared/lib/i18n'
import { useIsMobile } from '@/shared/hooks/use-media-query'

type TopBarProps = {
  isMobile: boolean
  onToggleNav: () => void
  onOpenMobileMenu: () => void
}

const TopBar = ({ isMobile, onToggleNav, onOpenMobileMenu }: TopBarProps) => {
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
        'flex min-h-[52px] h-auto flex-shrink-0 items-center',
        isMacInset ? 'pl-20' : ''
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {platform === 'windows' && (
        <span className="pl-3 text-xs font-bold tracking-tight text-muted-foreground/30 select-none">Argus</span>
      )}

      <div className="flex w-14 shrink-0 items-center justify-center">
        {isMobile ? (
          <Tooltip>
            <TooltipTrigger
              onClick={onOpenMobileMenu}
              className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors [-webkit-app-region:no-drag]"
            >
              <Menu className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('shared.navLayout.openMenu')}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={onToggleNav}
              className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors [-webkit-app-region:no-drag]"
            >
              <PanelLeft className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('shared.navLayout.toggleSidebar')}</TooltipContent>
          </Tooltip>
        )}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NAV_COLLAPSED)
      if (stored !== null) setCollapsed(JSON.parse(stored))
    } catch {}

    const handler = (e: Event) => setCollapsed((e as CustomEvent<boolean>).detail)
    window.addEventListener('argus-nav-toggle', handler)
    return () => window.removeEventListener('argus-nav-toggle', handler)
  }, [])

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false)
  }, [isMobile])

  const toggleNav = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEYS.NAV_COLLAPSED, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
    } catch {}
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-sunken)]">
      <TopBar isMobile={isMobile} onToggleNav={toggleNav} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 min-h-0 gap-0">
        <div className="hidden md:flex">
          <Nav />
        </div>
        <main className={cn(
          'flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]',
          'md:rounded-tl-2xl'
        )}>
          {children}
        </main>
      </div>
      <BottomBar />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[var(--bg-sunken)]',
          'transform transition-transform duration-200',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Nav isOverlay onClose={() => setMobileMenuOpen(false)} />
      </div>
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
