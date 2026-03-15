import type { ReactNode } from 'react'

type FilterBarProps = {
  children: ReactNode
}

export const FilterBar = ({ children }: FilterBarProps) => {
  return (
    <div className="border-b bg-[var(--bg-base)] px-4 py-2.5 flex items-center gap-3">
      {children}
    </div>
  )
}
