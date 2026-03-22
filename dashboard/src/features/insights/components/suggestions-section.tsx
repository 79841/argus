'use client'

import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import type { Suggestion } from '@/shared/lib/suggestions'

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  warning: {
    border: 'border-l-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  info: {
    border: 'border-l-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
} as const

type SuggestionCardProps = {
  suggestion: Suggestion
}

const SuggestionCard = ({ suggestion }: SuggestionCardProps) => {
  const { t } = useLocale()
  const cfg = SEVERITY_CONFIG[suggestion.severity]
  const Icon = cfg.icon
  const p = suggestion.params
  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border-l-4 bg-card p-4',
        cfg.border
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cfg.iconColor)} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{t(suggestion.titleKey, p)}</span>
          <Badge className={cn('text-[10px] px-1.5 py-0 capitalize', cfg.badge)}>
            {suggestion.severity}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {suggestion.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t(suggestion.descriptionKey, p)}</p>
        <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
          <span>
            {t('insights.suggestions.current')}: <span className="font-medium text-foreground">{suggestion.metric}</span>
          </span>
          <span>
            {t('insights.suggestions.targetLabel')}: <span className="font-medium text-foreground">{t(suggestion.targetKey, p)}</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('insights.suggestions.actionLabel')}: </span>
          {t(suggestion.actionKey, p)}
        </p>
      </div>
    </div>
  )
}

type SuggestionsSectionProps = {
  suggestions: Suggestion[]
  suggestionsLoading: boolean
}

export const SuggestionsSection = ({ suggestions, suggestionsLoading }: SuggestionsSectionProps) => {
  const { t } = useLocale()
  return (
    <ChartCard title={t('insights.suggestions')}>
      {suggestionsLoading ? (
        <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
          {t('insights.suggestions.loading')}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border-l-4 border-l-green-500 bg-card p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="text-sm font-semibold">{t('insights.suggestions.allGood')}</p>
            <p className="text-xs text-muted-foreground">{t('insights.suggestions.allGood.desc')}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </ChartCard>
  )
}
