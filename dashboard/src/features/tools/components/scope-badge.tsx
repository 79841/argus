import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { SCOPE_BADGE } from './constants'

type ScopeBadgeProps = {
  scope?: 'project' | 'global'
  projectName?: string
}

export const ScopeBadge = ({ scope, projectName }: ScopeBadgeProps) => {
  if (!scope) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <Badge className={cn('text-[10px] px-1.5 py-0 w-fit', SCOPE_BADGE[scope].className)}>
      {scope === 'project' && projectName ? projectName : SCOPE_BADGE[scope].label}
    </Badge>
  )
}
