'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { getDocUrl } from '@/lib/docs-shared'
import type { Locale, SidebarItem } from '@/lib/docs-shared'

type DocSidebarProps = {
  sidebar: SidebarItem[]
  locale: Locale
}

function SidebarContent({
  sidebar,
  locale,
  onItemClick,
}: {
  sidebar: SidebarItem[]
  locale: Locale
  onItemClick?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {sidebar.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const href = getDocUrl(item.slug, locale)
              const isActive = pathname === href
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    onClick={onItemClick}
                    className={[
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100',
                    ].join(' ')}
                  >
                    {item.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function DocSidebar({ sidebar, locale }: DocSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen])

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="flex items-center gap-2 rounded-md border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 dark:border-surface-700 dark:text-surface-300 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu size={16} />
        Navigation
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white p-6 shadow-xl dark:bg-surface-900 lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-semibold text-surface-900 dark:text-surface-50">Docs</span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} className="text-surface-600 dark:text-surface-400" />
            </button>
          </div>
          <SidebarContent sidebar={sidebar} locale={locale} onItemClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24">
          <SidebarContent sidebar={sidebar} locale={locale} />
        </div>
      </aside>
    </>
  )
}
