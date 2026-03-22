import { cn } from '@/shared/lib/utils'

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

type StatusBadgeProps = {
  status: StatusType
  label: string
  size?: 'sm' | 'md'
  className?: string
}

export const StatusBadge = ({ status, label, size = 'sm', className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider',
        size === 'sm' ? 'text-[10px] leading-[14px]' : 'text-xs leading-4',
        className
      )}
      style={{
        backgroundColor: status === 'neutral'
          ? 'oklch(0.5 0 0 / 5%)'
          : `color-mix(in oklch, var(--status-${status}) 10%, transparent)`,
        color: status === 'neutral' ? 'var(--text-tertiary)' : `var(--status-${status})`,
      }}
    >
      {label}
    </span>
  )
}
