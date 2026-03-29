'use client'

import { AGENTS } from '@/shared/lib/agents'
import type { AgentType } from '@/shared/lib/agents'
import { AgentDot } from '@/shared/components/ui/agent-dot'
import { formatCost, formatRelativeTime, formatTokens } from '@/shared/lib/format'
import { useBottomBarData } from '@/shared/hooks/use-bottom-bar-data'
import { useLocale } from '@/shared/lib/i18n'

const getStatusDot = (iso: string | null): string => {
  if (!iso) return 'bg-gray-300 dark:bg-gray-600'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = diff / 3600000
  if (hours < 1) return 'bg-green-500'
  if (hours < 24) return 'bg-yellow-500'
  return 'bg-gray-400'
}

const formatModel = (model: string): string => {
  if (!model) return ''
  const parts = model.split('/')
  const raw = parts[parts.length - 1]
  const stripped = raw.replace(/^(claude|codex|gemini)-/i, '')
  return stripped.length > 16 ? `${stripped.slice(0, 14)}…` : stripped
}

export const BottomBar = () => {
  const { agents, totals, activeSessions, agentTypes } = useBottomBarData()
  const { t } = useLocale()

  return (
    <footer className="flex h-8 shrink-0 items-center bg-[var(--bg-sunken)] px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {agentTypes.map((type) => {
          const status = agents.find((a) => a.agent_type === type)
          const config = AGENTS[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${getStatusDot(status?.last_received ?? null)}`}
              />
              <span className="hidden md:inline" style={{ color: `var(--agent-${type})` }}>
                {config.name}
              </span>
              {status ? (
                <span className="hidden md:inline">{formatRelativeTime(status.last_received)}</span>
              ) : (
                <span className="hidden md:inline text-muted-foreground/50">
                  {t('shared.bottomBar.noData')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {activeSessions.length > 0 && (
        <div className="hidden md:flex ml-4 items-center gap-1">
          <div className="h-3 w-px bg-border mx-1" />
          <AgentDot agent={activeSessions[0].agent_type as AgentType} size="sm" pulse />
          {activeSessions.slice(0, 3).map((s) => {
            const config = AGENTS[s.agent_type as AgentType]
            return (
              <div key={s.session_id} className="flex items-center gap-1 ml-1">
                <span className="font-medium" style={{ color: `var(--agent-${s.agent_type})` }}>
                  {config?.name ?? s.agent_type}
                </span>
                {s.model && (
                  <span className="hidden lg:inline text-muted-foreground/70">
                    {formatModel(s.model)}
                  </span>
                )}
                <span>{formatCost(s.cost)}</span>
              </div>
            )
          })}
          {activeSessions.length > 3 && (
            <span>+{activeSessions.length - 3}</span>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1 whitespace-nowrap">
        <span>{t('shared.bottomBar.total')}: {formatCost(totals.total_cost)}</span>
        <span className="hidden lg:inline text-muted-foreground/60">
          / {formatTokens(totals.total_tokens)} {t('shared.bottomBar.tokens')}
        </span>
      </div>
    </footer>
  )
}
