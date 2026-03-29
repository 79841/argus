'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/shared/lib/i18n'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { DataTable } from '@/shared/components/ui/data-table'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { formatCostDetail, shortenModel } from '@/shared/lib/format'
import type { HighCostSession } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'

const CAUSE_COLORS: Record<string, string> = {
  expensive_model: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  many_tool_calls: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  many_requests: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  no_cache: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

const CAUSE_I18N_KEYS: Record<string, string> = {
  expensive_model: 'insights.cause.expensiveModel',
  many_tool_calls: 'insights.cause.manyToolCalls',
  many_requests: 'insights.cause.manyRequests',
  no_cache: 'insights.cause.noCache',
}

type HighCostTableProps = {
  data: HighCostSession[]
  loading: boolean
}

export const HighCostTable = ({ data, loading }: HighCostTableProps) => {
  const { t } = useLocale()
  const router = useRouter()

  const sessionColumns = [
    {
      key: 'agent_type',
      label: t('insights.col.agent'),
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    {
      key: 'model',
      label: t('insights.col.model'),
      format: (v: unknown) => {
        const models = String(v).split(',').map(m => shortenModel(m.trim()))
        const first = models[0]
        const rest = models.length - 1
        return (
          <span
            className="font-mono text-xs"
            title={models.join(', ')}
          >
            {first}
            {rest > 0 && (
              <span className="ml-1 text-muted-foreground">+{rest}</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'total_cost',
      label: t('insights.col.cost'),
      align: 'right' as const,
      format: (v: unknown) => <span className="font-semibold">{formatCostDetail(Number(v))}</span>,
    },
    {
      key: 'request_count',
      label: t('insights.col.reqs'),
      align: 'right' as const,
      format: (v: unknown) => String(v),
    },
    {
      key: 'tool_call_count',
      label: t('insights.col.tools'),
      align: 'right' as const,
      format: (v: unknown) => String(v),
    },
    {
      key: 'causes',
      label: t('insights.col.causes'),
      format: (v: unknown) => (
        <div className="flex flex-wrap gap-1">
          {(v as string[]).map(c => {
            const color = CAUSE_COLORS[c]
            const i18nKey = CAUSE_I18N_KEYS[c]
            const label = i18nKey ? t(i18nKey) : c
            return (
              <Badge key={c} className={cn('text-[10px] px-1.5 py-0', color ?? 'bg-muted text-muted-foreground')}>
                {label}
              </Badge>
            )
          })}
        </div>
      ),
    },
  ]

  return (
    <ChartCard title={t('insights.highCostSessions')}>
      {loading ? (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
          {t('insights.loading')}
        </div>
      ) : !data.length ? (
        <EmptyState title={t('insights.noHighCost')} />
      ) : (
        <DataTable<HighCostSession>
          columns={sessionColumns}
          data={data}
          onRowClick={(row) => router.push(`/sessions/${row.session_id}`)}
        />
      )}
    </ChartCard>
  )
}
