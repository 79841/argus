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
  FolderKanban,
  Settings,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLocale } from '@/shared/lib/i18n'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { STORAGE_KEYS } from '@/shared/lib/constants'

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
  { href: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/rules', labelKey: 'nav.rules', icon: FileText },
  { href: '/insights', labelKey: 'nav.insights', icon: Lightbulb },
]

const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  labelKey: 'nav.settings',
  icon: Settings,
}

export const Nav = () => {
  const pathname = usePathname()
  const { t } = useLocale()
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

  return (
    <aside
      className={cn(
        'flex flex-shrink-0 flex-col transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-48'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-2 overflow-y-auto">
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

      {/* Settings */}
      <div className="mt-auto px-2 py-2">
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
