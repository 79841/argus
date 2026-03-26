'use client'

import { Badge } from '@/shared/components/ui/badge'
import { useLocale } from '@/shared/lib/i18n'
import { formatRelativeTime } from '@/shared/lib/format'

type ToolDetailHeaderProps = {
  toolName: string
  category?: string
  lastUsed?: string
}

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  'MCP': 'default',
  'Orchestration': 'secondary',
  'Built-in': 'outline',
}

export const ToolDetailHeader = ({ toolName, category, lastUsed }: ToolDetailHeaderProps) => {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-lg font-semibold">{toolName}</h1>
        {category && (
          <Badge variant={CATEGORY_VARIANT[category] ?? 'outline'}>
            {category}
          </Badge>
        )}
      </div>
      {lastUsed && (
        <p className="text-xs text-muted-foreground">
          {t('tools.detail.lastUsed')}: {formatRelativeTime(lastUsed)}
        </p>
      )}
    </div>
  )
}
