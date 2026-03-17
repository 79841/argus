'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocItem } from '@/lib/toc-utils'

type TocProps = {
  items: TocItem[]
}

export function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (items.length === 0) return

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      const visible = entries.filter((e) => e.isIntersecting)
      if (visible.length > 0) {
        setActiveId(visible[0].target.id)
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    })

    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current!.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav aria-label="Table of contents" className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
        On this page
      </p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={[
            'block py-1 text-sm leading-snug transition-colors',
            item.level === 3 ? 'pl-4' : '',
            activeId === item.id
              ? 'font-medium text-primary-600 dark:text-primary-400'
              : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100',
          ].join(' ')}
        >
          {item.text}
        </a>
      ))}
    </nav>
  )
}
