'use client'

import { useLocale } from '@/shared/lib/i18n'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { cn } from '@/shared/lib/utils'
import { formatCost } from '@/shared/lib/format'
import type { BudgetStatus } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'

type BudgetGaugesProps = {
  budgetStatus: BudgetStatus[]
}

export const BudgetGauges = ({ budgetStatus }: BudgetGaugesProps) => {
  const { t } = useLocale()

  if (!budgetStatus.some((b) => b.daily_cost_limit > 0)) {
    return null
  }

  return (
    <ChartCard title={t('insights.dailyBudget')}>
      <div className="grid grid-cols-3 gap-4 p-2">
        {budgetStatus.map((b) => {
          const usagePct = Math.min(b.daily_usage_pct, 100)
          const exceeded = b.daily_usage_pct > 100
          return (
            <div key={b.agent_type} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <AgentBadge agent={b.agent_type as AgentType} />
                <span className={cn('text-xs font-medium tabular-nums', exceeded && 'text-red-500')}>
                  {formatCost(b.daily_spent)} / {b.daily_cost_limit > 0 ? formatCost(b.daily_cost_limit) : t('insights.noLimit')}
                </span>
              </div>
              {b.daily_cost_limit > 0 && (
                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all',
                      exceeded ? 'bg-red-500' : 'bg-primary'
                    )}
                    style={{
                      width: `${usagePct}%`,
                      ...(!exceeded ? { backgroundColor: `var(--agent-${b.agent_type})` } : {}),
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
