'use client'

import { useEffect, useState } from 'react'
import { AGENTS } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { AgentDot } from '@/components/ui/agent-dot'
import { dataClient } from '@/lib/data-client'

type AgentStatus = {
  agent_type: string
  last_received: string
  today_count: number
  total_count: number
}

type AllTimeTotals = {
  total_cost: number
  total_tokens: number
}

type AgentLimit = {
  agent_type: string
  daily_cost_limit: number
  monthly_cost_limit: number
}

type AgentDailyCost = {
  agent_type: string
  daily_cost: number
}

const formatTokensShort = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const getStatusDot = (iso: string | null): string => {
  if (!iso) return 'bg-gray-300 dark:bg-gray-600'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = diff / 3600000
  if (hours < 1) return 'bg-green-500'
  if (hours < 24) return 'bg-yellow-500'
  return 'bg-gray-400'
}

type ActiveSessionInfo = {
  session_id: string
  agent_type: string
  model: string
  last_event: string
  cost: number
  event_count: number
}

const formatModel = (model: string): string => {
  if (!model) return ''
  const parts = model.split('/')
  const name = parts[parts.length - 1]
  return name.length > 20 ? `${name.slice(0, 18)}...` : name
}

const ACTIVE_POLL_MS = 30_000

export const BottomBar = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [totals, setTotals] = useState<AllTimeTotals>({ total_cost: 0, total_tokens: 0 })
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([])
  const [limits, setLimits] = useState<AgentLimit[]>([])
  const [dailyCosts, setDailyCosts] = useState<AgentDailyCost[]>([])

  useEffect(() => {
    dataClient.query('ingest-status')
      .then((data: unknown) => setAgents((data as { agents?: AgentStatus[] }).agents ?? []))
      .catch(() => {})
    dataClient.query('overview', { agent_type: 'all' })
      .then((data: unknown) => {
        const d = data as { all_time_cost?: number; all_time_tokens?: number }
        setTotals({
          total_cost: d.all_time_cost ?? 0,
          total_tokens: d.all_time_tokens ?? 0,
        })
      })
      .catch(() => {})
    dataClient.query('settings/limits')
      .then((data: unknown) => setLimits((data as { limits?: AgentLimit[] }).limits ?? []))
      .catch(() => {})
    dataClient.query('daily-costs')
      .then((data: unknown) => setDailyCosts((data as { costs?: AgentDailyCost[] }).costs ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchActive = () => {
      dataClient.query('sessions/active')
        .then((data: unknown) => setActiveSessions((data as { sessions?: ActiveSessionInfo[] }).sessions ?? []))
        .catch(() => {})
    }
    fetchActive()
    const id = setInterval(fetchActive, ACTIVE_POLL_MS)
    return () => clearInterval(id)
  }, [])

  const agentTypes: AgentType[] = ['claude', 'codex', 'gemini']

  // Build limit progress data
  const limitBars = agentTypes
    .map((type) => {
      const limit = limits.find((l) => l.agent_type === type)
      if (!limit || limit.daily_cost_limit <= 0) return null
      const cost = dailyCosts.find((c) => c.agent_type === type)?.daily_cost ?? 0
      const pct = Math.min((cost / limit.daily_cost_limit) * 100, 100)
      const exceeded = cost >= limit.daily_cost_limit
      return { type, pct, cost, limit: limit.daily_cost_limit, exceeded }
    })
    .filter(Boolean) as { type: AgentType; pct: number; cost: number; limit: number; exceeded: boolean }[]

  return (
    <footer className="flex h-8 shrink-0 items-center border-t bg-background px-4 text-xs text-muted-foreground">
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
                <span className="text-muted-foreground">${s.cost.toFixed(2)}</span>
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
                  {config.name}: ${bar.cost.toFixed(2)} / ${bar.limit.toFixed(2)} daily
                  {bar.exceeded && ' (exceeded)'}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span>Total: ${totals.total_cost.toFixed(2)} / {formatTokensShort(totals.total_tokens)} tokens</span>
      </div>
    </footer>
  )
}
