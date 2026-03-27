'use client'

import { AGENTS } from '@/shared/lib/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AgentDot } from '@/shared/components/ui/agent-dot'
import { formatCost, formatRelativeTime } from '@/shared/lib/format'
import { useLocale } from '@/shared/lib/i18n'

const AGENT_ORDER = ['claude', 'codex', 'gemini'] as const

type AgentSummary = {
  agent_type: string
  today_cost: number
  today_requests: number
  last_active: string | null
}

type AgentSummaryCardProps = {
  agentSummaries: AgentSummary[]
}

export const AgentSummaryCard = ({ agentSummaries }: AgentSummaryCardProps) => {
  const { t } = useLocale()
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium">{t('dashboard.agentSummary.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {AGENT_ORDER.map((agentId) => {
          const agent = AGENTS[agentId]
          const summary = agentSummaries.find((s) => s.agent_type === agentId)
          return (
            <div
              key={agentId}
              className="flex items-center justify-between rounded-lg bg-[var(--fill-active)] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <AgentDot agent={agentId} size="md" />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              {summary ? (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCost(summary.today_cost)}</span>
                  <span>{summary.today_requests} {t('dashboard.agentSummary.reqs')}</span>
                  {summary.last_active && (
                    <span>{formatRelativeTime(summary.last_active)}</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t('dashboard.agentSummary.noActivity')}</span>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
