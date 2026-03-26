'use client'

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

  const tabs: Tab[] = [
    { labelKey: 'projects.tab.overview', href: base },
    { labelKey: 'projects.tab.sessions', href: `${base}/sessions` },
    { labelKey: 'projects.tab.usage', href: `${base}/usage` },
    { labelKey: 'projects.tab.tools', href: `${base}/tools` },
    { labelKey: 'projects.tab.rules', href: `${base}/rules` },
  ]

  return (
    <nav className="flex border-b px-4">
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
              'px-4 py-2 text-sm transition-colors',
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
