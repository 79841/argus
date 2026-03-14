'use client'

import { useEffect, useState } from 'react'
import { AGENTS } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'

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

const ACTIVE_POLL_MS = 30_000

export const BottomBar = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [totals, setTotals] = useState<AllTimeTotals>({ total_cost: 0, total_tokens: 0 })
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    fetch('/api/ingest-status')
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => {})
    fetch('/api/overview?agent_type=all')
      .then((r) => r.json())
      .then((data) => {
        setTotals({
          total_cost: data.all_time_cost ?? 0,
          total_tokens: data.all_time_tokens ?? 0,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/sessions/active')
        .then((r) => r.json())
        .then((data) => setActiveCount((data.sessions ?? []).length))
        .catch(() => {})
    }
    fetchActive()
    const id = setInterval(fetchActive, ACTIVE_POLL_MS)
    return () => clearInterval(id)
  }, [])

  const agentTypes: AgentType[] = ['claude', 'codex', 'gemini']

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
              <span style={{ color: config.hex }}>{config.name}</span>
              {status ? (
                <span>{formatRelativeTime(status.last_received)}</span>
              ) : (
                <span className="text-muted-foreground/50">no data</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span>Total: ${totals.total_cost.toFixed(2)} / {formatTokensShort(totals.total_tokens)} tokens</span>
      </div>
    </footer>
  )
}
