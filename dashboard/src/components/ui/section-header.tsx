import type { ReactNode } from 'react'

type SectionHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export const SectionHeader = ({ title, description, actions }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  )
}
