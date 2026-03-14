'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

import type { LucideIcon } from 'lucide-react'

type NavPage = {
  href: string
  labelKey: string
  icon: LucideIcon
}

type NavCategory = {
  key: string
  labelKey: string
  icon: LucideIcon
  pages: NavPage[]
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    key: 'monitoring',
    labelKey: 'nav.monitoring',
    icon: BarChart3,
    pages: [
      { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { href: '/sessions', labelKey: 'nav.sessions', icon: MessageSquare },
      { href: '/cost', labelKey: 'nav.cost', icon: DollarSign },
    ],
  },
  {
    key: 'analysis',
    labelKey: 'nav.analysis',
    icon: FlaskConical,
    pages: [
      { href: '/tools', labelKey: 'nav.tools', icon: Wrench },
    ],
  },
]

const SETTINGS_ITEM: NavPage = {
  href: '/settings',
  labelKey: 'nav.settings',
  icon: Settings,
}

const STORAGE_KEY = 'argus-nav-collapsed'
const ACCORDION_KEY = 'argus-nav-accordion'

const CategoryPopover = ({
  category,
  anchorRef,
  onClose,
  pathname,
  translate,
}: {
  category: NavCategory
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  pathname: string
  translate: (key: string) => string
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.top, left: rect.right + 8 })
    }
  }, [anchorRef])

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 min-w-40 rounded-md border bg-popover p-1 shadow-md"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {translate(category.labelKey)}
      </div>
      {category.pages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          onClick={onClose}
          className={cn(
            'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
            pathname === page.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <page.icon className="size-4" />
          {translate(page.labelKey)}
        </Link>
      ))}
    </div>
  )
}

export const Nav = () => {
  const pathname = usePathname()
  const { t } = useLocale()
  const [collapsed, setCollapsed] = useState(false)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})
  const [popoverCategory, setPopoverCategory] = useState<string | null>(null)
  const categoryRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({})

  // Initialize refs for each category
  for (const cat of NAV_CATEGORIES) {
    if (!categoryRefs.current[cat.key]) {
      categoryRefs.current[cat.key] = { current: null }
    }
  }

  // Load persisted state
  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem(STORAGE_KEY)
      if (storedCollapsed !== null) {
        setCollapsed(JSON.parse(storedCollapsed))
      }
      const storedAccordion = localStorage.getItem(ACCORDION_KEY)
      if (storedAccordion !== null) {
        setOpenAccordions(JSON.parse(storedAccordion))
      } else {
        // Default: all open
        const defaults: Record<string, boolean> = {}
        for (const cat of NAV_CATEGORIES) {
          defaults[cat.key] = true
        }
        setOpenAccordions(defaults)
      }
    } catch {
      // ignore
    }
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    setPopoverCategory(null)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: next }))
    } catch {
      // ignore
    }
  }

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(ACCORDION_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const handlePopoverToggle = useCallback((key: string) => {
    setPopoverCategory((prev) => (prev === key ? null : key))
  }, [])

  const closePopover = useCallback(() => {
    setPopoverCategory(null)
  }, [])

  const isCategoryActive = (category: NavCategory) =>
    category.pages.some((p) => p.href === pathname)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-background transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-52'
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-14 items-center pt-10',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        {!collapsed && (
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            Argus
          </Link>
        )}
        {collapsed && (
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            A
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 px-2 py-3 overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {NAV_CATEGORIES.map((category) => (
          <div key={category.key} className="mb-1">
            {collapsed ? (
              /* Collapsed: icon button + popover */
              <>
                <Tooltip>
                  <TooltipTrigger
                    ref={(el: HTMLButtonElement | null) => {
                      const ref = categoryRefs.current[category.key]
                      if (ref) ref.current = el
                    }}
                    onClick={() => handlePopoverToggle(category.key)}
                    className={cn(
                      'flex w-full items-center justify-center rounded-md p-2 transition-colors',
                      isCategoryActive(category)
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <category.icon className="size-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t(category.labelKey)}
                  </TooltipContent>
                </Tooltip>
                {popoverCategory === category.key && (
                  <CategoryPopover
                    category={category}
                    anchorRef={categoryRefs.current[category.key]}
                    onClose={closePopover}
                    pathname={pathname}
                    translate={t}
                  />
                )}
              </>
            ) : (
              /* Expanded: accordion */
              <>
                <button
                  onClick={() => toggleAccordion(category.key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <category.icon className="size-4" />
                  <span className="flex-1 text-left">{t(category.labelKey)}</span>
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform duration-200',
                      openAccordions[category.key] ? '' : '-rotate-90'
                    )}
                  />
                </button>
                {openAccordions[category.key] && (
                  <div className="mt-0.5 space-y-0.5">
                    {category.pages.map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ml-2',
                          pathname === page.href
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <page.icon className="size-4" />
                        {t(page.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom section: Settings + Toggle */}
      <div
        className="border-t px-2 py-2 space-y-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Settings */}
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

        {/* Collapse toggle */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('nav.expand')}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-4" />
            {t('nav.collapse')}
          </button>
        )}
      </div>
    </aside>
  )
}
