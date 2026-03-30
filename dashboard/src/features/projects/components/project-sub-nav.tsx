'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { useLocale } from '@/shared/lib/i18n'

type Tab = {
  labelKey: string
  href: string
}

type ProjectSubNavProps = {
  projectName: string
}

export const ProjectSubNav = ({ projectName }: ProjectSubNavProps) => {
  const pathname = usePathname()
  const { t } = useLocale()
  const base = `/projects/${encodeURIComponent(projectName)}`
  const navRef = useRef<HTMLElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setCanScroll(el.scrollWidth > el.clientWidth + 1)
  }, [])

  useEffect(() => {
    checkOverflow()
    const ro = new ResizeObserver(checkOverflow)
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [checkOverflow])

  const tabs: Tab[] = [
    { labelKey: 'projects.tab.overview', href: base },
    { labelKey: 'projects.tab.sessions', href: `${base}/sessions` },
    { labelKey: 'projects.tab.usage', href: `${base}/usage` },
    { labelKey: 'projects.tab.tools', href: `${base}/tools` },
    { labelKey: 'projects.tab.rules', href: `${base}/rules` },
  ]

  return (
    <nav
      ref={navRef}
      className={cn(
        'flex border-b px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden',
        canScroll && '[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]'
      )}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === base
            ? pathname === base || pathname === `${base}/`
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm transition-colors whitespace-nowrap',
              isActive
                ? 'border-b-2 border-primary font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(tab.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
