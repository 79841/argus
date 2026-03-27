'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import type { Heading } from '@/features/rules/components/markdown-viewer'

type TocSidebarProps = {
  headings: Heading[]
  containerRef: RefObject<HTMLElement | null>
}

const INDENT_MAP: Record<number, string> = {
  1: 'ml-0',
  2: 'ml-3',
  3: 'ml-6',
  4: 'ml-9',
}

export const TocSidebar = ({ headings, containerRef }: TocSidebarProps) => {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const headingIdsRef = useRef<string[]>([])

  const updateActiveFromScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const ids = headingIdsRef.current
    let activeIdx = 0

    for (let i = ids.length - 1; i >= 0; i--) {
      const el = document.getElementById(ids[i])
      if (!el) continue
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const relativeTop = elRect.top - containerRect.top
      if (relativeTop <= 24) {
        activeIdx = i
        break
      }
    }

    setActiveId(ids[activeIdx] ?? '')
  }, [containerRef])

  useEffect(() => {
    if (headings.length < 3) {
      observerRef.current?.disconnect()
      return
    }

    const container = containerRef.current
    if (!container) return

    const ids = headings.map((h) => h.id).filter(Boolean)
    headingIdsRef.current = ids

    updateActiveFromScroll()

    const handleScroll = () => {
      requestAnimationFrame(updateActiveFromScroll)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [headings, containerRef, updateActiveFromScroll])

  if (headings.length < 3) return null

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return

    const container = containerRef.current
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const scrollTop =
        container.scrollTop + (elementRect.top - containerRect.top) - 16

      container.scrollTo({ top: scrollTop, behavior: 'smooth' })
    } else {
      element.scrollIntoView({ behavior: 'smooth' })
    }

    setActiveId(id)
  }

  const seenIds = new Map<string, number>()

  return (
    <nav className="glass-light overflow-y-auto py-2 px-3">
      {headings.map((heading, idx) => {
        const isActive = activeId === heading.id
        const indent = INDENT_MAP[heading.level] ?? 'ml-0'

        const count = seenIds.get(heading.id) ?? 0
        seenIds.set(heading.id, count + 1)
        const uniqueKey = count > 0 ? `${heading.id}-${count}` : (heading.id || `heading-${idx}`)

        return (
          <button
            key={uniqueKey}
            onClick={() => handleClick(heading.id)}
            className={[
              'block w-full text-left text-xs py-1 leading-snug transition-colors',
              'hover:text-foreground',
              indent,
              isActive
                ? 'text-foreground font-medium border-l-2 border-primary pl-2 -ml-[1px]'
                : 'text-muted-foreground',
            ].join(' ')}
          >
            {heading.text}
          </button>
        )
      })}
    </nav>
  )
}
