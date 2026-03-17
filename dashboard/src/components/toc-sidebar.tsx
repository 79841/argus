'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Heading } from '@/components/markdown-viewer'

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

  useEffect(() => {
    if (headings.length < 3) {
      observerRef.current?.disconnect()
      return
    }

    const container = containerRef.current
    if (!container) return

    observerRef.current?.disconnect()

    const headingElements = Array.from(
      container.querySelectorAll<HTMLElement>('h1, h2, h3, h4')
    )

    const visibleHeadings = new Map<string, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).id
          if (entry.isIntersecting) {
            visibleHeadings.set(id, entry.boundingClientRect.top)
          } else {
            visibleHeadings.delete(id)
          }
        })

        if (visibleHeadings.size === 0) return

        const topmost = Array.from(visibleHeadings.entries()).sort(
          (a, b) => a[1] - b[1]
        )[0]
        setActiveId(topmost[0])
      },
      {
        root: container,
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      }
    )

    headingElements.forEach((el) => {
      if (el.id) observerRef.current?.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [headings, containerRef])

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
  }

  return (
    <nav className="overflow-y-auto py-2 px-3 border-l">
      {headings.map((heading) => {
        const isActive = activeId === heading.id
        const indent = INDENT_MAP[heading.level] ?? 'ml-0'

        return (
          <button
            key={heading.id}
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
