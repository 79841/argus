'use client'

import { AGENTS } from '@/shared/lib/agents'
import type { AgentType } from '@/shared/lib/agents'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip'
import { AgentDot } from '@/shared/components/ui/agent-dot'
import { formatCost } from '@/shared/lib/format'
import { formatRelativeTime } from '@/shared/lib/format'
import { useBottomBarData } from '@/shared/hooks/use-bottom-bar-data'

const formatTokensShort = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

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
  const name = parts[parts.length - 1]
  return name.length > 20 ? `${name.slice(0, 18)}...` : name
}

export const BottomBar = () => {
  const { agents, totals, activeSessions, limitBars, agentTypes } = useBottomBarData()

  return (
    <footer className="flex h-8 shrink-0 items-center bg-[var(--bg-sunken)] px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        {agentTypes.map((type) => {
          const status = agents.find((a) => a.agent_type === type)
          const config = AGENTS[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${getStatusDot(status?.last_received ?? null)}`}
              />
              <span style={{ color: `var(--agent-${type})` }}>{config.name}</span>
              {status ? (
                <span>{formatRelativeTime(status.last_received)}</span>
              ) : (
                <span className="text-muted-foreground/50">no data</span>
              )}
            </div>
          )
        })}
      </div>

      {activeSessions.length > 0 && (
        <div className="ml-4 flex items-center gap-1.5">
          <div className="h-3 w-px bg-border" />
          <AgentDot agent={activeSessions[0].agent_type as AgentType} size="sm" pulse />
          {activeSessions.slice(0, 3).map((s) => {
            const config = AGENTS[s.agent_type as AgentType]
            return (
              <div key={s.session_id} className="flex items-center gap-1 ml-1">
                <span className="font-medium" style={{ color: `var(--agent-${s.agent_type})` }}>
                  {config?.name ?? s.agent_type}
                </span>
                {s.model && (
                  <span className="text-muted-foreground">{formatModel(s.model)}</span>
                )}
                <span className="text-muted-foreground">{formatCost(s.cost)}</span>
              </div>
            )
          })}
          {activeSessions.length > 3 && (
            <span className="text-muted-foreground">+{activeSessions.length - 3}</span>
          )}
        </div>
      )}

      {limitBars.length > 0 && (
        <div className="ml-4 flex items-center gap-3">
          <div className="h-3 w-px bg-border" />
          {limitBars.map((bar) => {
            const config = AGENTS[bar.type]
            return (
              <Tooltip key={bar.type}>
                <TooltipTrigger className="flex items-center gap-1.5">
                  <span style={{ color: `var(--agent-${bar.type})` }} className="text-[10px] font-medium">
                    {config.name}
                  </span>
                  <div className="relative h-2 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all',
                        bar.exceeded ? 'bg-red-500' : 'bg-current'
                      )}
                      style={{
                        width: `${bar.pct}%`,
                        ...(!bar.exceeded ? { backgroundColor: `var(--agent-${bar.type})` } : {}),
                      }}
                    />
                  </div>
                  <span className={cn(
                    'text-[10px] tabular-nums',
                    bar.exceeded && 'text-red-500 font-medium'
                  )}>
                    {Math.round(bar.pct)}%
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {config.name}: {formatCost(bar.cost)} / {formatCost(bar.limit)} daily
                  {bar.exceeded && ' (exceeded)'}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span>Total: {formatCost(totals.total_cost)} / {formatTokensShort(totals.total_tokens)} tokens</span>
      </div>
    </footer>
  )
}
