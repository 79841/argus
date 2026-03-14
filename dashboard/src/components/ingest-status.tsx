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

const getStatusColor = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = diff / 3600000
  if (hours < 1) return 'bg-green-500'
  if (hours < 24) return 'bg-yellow-500'
  return 'bg-gray-400'
}

export const IngestStatus = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([])

  useEffect(() => {
    fetch('/api/ingest-status')
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => {})
  }, [])

  const agentTypes: AgentType[] = ['claude', 'codex', 'gemini']

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {agentTypes.map((type) => {
        const status = agents.find((a) => a.agent_type === type)
        const config = AGENTS[type]
        return (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${status ? getStatusColor(status.last_received) : 'bg-gray-300'}`}
            />
            <span style={{ color: config.hex }}>{config.name}</span>
            {status ? (
              <span>{formatRelativeTime(status.last_received)} · {status.today_count} today</span>
            ) : (
              <span className="text-muted-foreground/50">no data</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
