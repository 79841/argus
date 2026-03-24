'use client'

import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTopBarPortal } from '@/shared/components/top-bar-portal'

type FilterBarProps = {
  children: ReactNode
}

export const FilterBar = ({ children }: FilterBarProps) => {
  const { target } = useTopBarPortal()

  if (!target) return null

  return createPortal(
    <div className="flex flex-wrap items-center gap-3 [&_button]:[-webkit-app-region:no-drag] [&_input]:[-webkit-app-region:no-drag] [&_select]:[-webkit-app-region:no-drag] [&_a]:[-webkit-app-region:no-drag] [&_[role=combobox]]:[-webkit-app-region:no-drag]">
      {children}
    </div>,
    target
  )
}
