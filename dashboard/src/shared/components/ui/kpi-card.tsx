import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

type KpiCardProps = {
  label: string
  value: string
  sub?: string
  delta?: number | null
  deltaInverted?: boolean
  loading?: boolean
  className?: string
}

const DeltaIndicator = ({ delta, inverted }: { delta: number; inverted: boolean }) => {
  const isPositive = delta > 0
  const isGood = inverted ? !isPositive : isPositive
  const arrow = isPositive ? '▲' : '▼'
  const absValue = Math.abs(delta).toFixed(1)

  return (
    <span
      className="text-[10px] font-medium tabular-nums"
      style={{ color: isGood ? 'var(--status-success)' : 'var(--status-error)' }}
    >
      {arrow} {absValue}%
    </span>
  )
}

export const KpiCard = ({
  label,
  value,
  sub,
  delta,
  deltaInverted = false,
  loading = false,
  className,
}: KpiCardProps) => {
  if (loading) {
    return (
      <Card className={cn('gap-1', className)}>
        <CardHeader className="pb-1 pt-3 px-3">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('gap-1', className)}>
      <CardHeader className="pb-1 pt-3 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <p className="text-xl font-bold tabular-nums leading-7">{value}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {delta != null && (
            <DeltaIndicator delta={delta} inverted={deltaInverted} />
          )}
          {sub && (
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
