'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

type StatsCardProps = {
  title: string
  value: string | number
  description?: string
  tooltip?: string
}

export const StatsCard = ({ title, value, description, tooltip }: StatsCardProps) => {
  const card = (
    <Card className={tooltip ? 'cursor-help' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (!tooltip) return card

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        {card}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
