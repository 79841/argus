'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/daily', label: 'Daily' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/tools', label: 'Tools' },
  { href: '/efficiency', label: 'Efficiency' },
  { href: '/config-history', label: 'Config History' },
  { href: '/setup', label: 'Setup' },
]

export const Nav = () => {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-52 flex-col border-r bg-background"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex h-14 items-center px-4 pt-10">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          Argus
        </Link>
      </div>
      <nav
        className="flex-1 space-y-1 px-3 py-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div
        className="border-t px-3 py-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <ThemeToggle />
      </div>
    </aside>
  )
}
