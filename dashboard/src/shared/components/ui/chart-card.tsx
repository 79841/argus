import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

type ChartCardProps = {
  title: string
  height?: number
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  actions?: ReactNode
  children: ReactNode
}

export const ChartCard = ({
  title,
  height = 280,
  loading = false,
  empty = false,
  emptyMessage = 'No data',
  actions,
  children,
}: ChartCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-1">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div
            className="animate-pulse rounded bg-muted"
            style={{ height: `${height}px` }}
          />
        ) : empty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-disabled"
            style={{ height: `${height}px` }}
          >
            <BarChart3 className="size-10 opacity-50" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {emptyMessage}
            </span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
