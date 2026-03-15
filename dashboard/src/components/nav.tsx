'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Wrench,
  FileText,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  labelKey: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/sessions', labelKey: 'nav.sessions', icon: MessageSquare },
  { href: '/usage', labelKey: 'nav.usage', icon: BarChart3 },
  { href: '/tools', labelKey: 'nav.tools', icon: Wrench },
  { href: '/rules', labelKey: 'nav.rules', icon: FileText },
  { href: '/insights', labelKey: 'nav.insights', icon: Lightbulb },
]

const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  labelKey: 'nav.settings',
  icon: Settings,
}

const STORAGE_KEY = 'argus-nav-collapsed'

export const Nav = () => {
  const pathname = usePathname()
  const { t } = useLocale()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setCollapsed(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
    } catch {
      // ignore
    }
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-background transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-48'
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-14 items-center pt-10',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={toggleCollapsed}
              className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('nav.expand')}</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Link
              href="/"
              className="text-lg font-bold tracking-tight"
            >
              Argus
            </Link>
            <button
              onClick={toggleCollapsed}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <ChevronLeft className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {NAV_ITEMS.map((item) =>
          collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center rounded-md p-2 transition-colors',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  />
                }
              >
                <item.icon className="size-5" />
              </TooltipTrigger>
              <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          )
        )}
      </nav>

      {/* Bottom section: Settings */}
      <div
        className="border-t px-2 py-2 space-y-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={SETTINGS_ITEM.href}
                  className={cn(
                    'flex items-center justify-center rounded-md p-2 transition-colors',
                    pathname === SETTINGS_ITEM.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                />
              }
            >
              <Settings className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">{t(SETTINGS_ITEM.labelKey)}</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href={SETTINGS_ITEM.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === SETTINGS_ITEM.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Settings className="size-4" />
            {t(SETTINGS_ITEM.labelKey)}
          </Link>
        )}

      </div>
    </aside>
  )
}
