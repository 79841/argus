import type { ReactNode } from 'react'

type FilterBarProps = {
  children: ReactNode
}

export const FilterBar = ({ children }: FilterBarProps) => {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b bg-[var(--bg-base)] px-4 py-2.5">
      {children}
    </div>
  )
}
