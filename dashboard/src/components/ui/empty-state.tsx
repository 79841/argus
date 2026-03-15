import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

type EmptyStateProps = {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No data',
  description,
  action,
}: EmptyStateProps) => {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 py-8">
      <Icon className="size-10 text-muted-foreground opacity-40" strokeWidth={1.5} />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  )
}
