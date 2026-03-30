'use client'

import { type ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTopBarPortal } from '@/shared/components/top-bar-portal'

type FilterBarProps = {
  children: ReactNode
}

export const FilterBar = ({ children }: FilterBarProps) => {
  const { target } = useTopBarPortal()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScroll(el.scrollWidth > el.clientWidth + 1)
  }, [])

  useEffect(() => {
    checkOverflow()
    const ro = new ResizeObserver(checkOverflow)
    if (scrollRef.current) ro.observe(scrollRef.current)
    return () => ro.disconnect()
  }, [checkOverflow])

  if (!target) return null

  return createPortal(
    <div
      ref={scrollRef}
      className={`flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:flex-shrink-0 [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_select]:[-webkit-app-region:no-drag] [&_a]:[-webkit-app-region:no-drag] [&_[role=combobox]]:[-webkit-app-region:no-drag] ${canScroll ? '[mask-image:linear-gradient(to_right,black_calc(100%_-_24px),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%_-_24px),transparent)]' : ''}`}
    >
      {children}
    </div>,
    target
  )
}
