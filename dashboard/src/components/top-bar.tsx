'use client'

import { useState, useEffect, useCallback } from 'react'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { DateRangePicker } from '@/components/date-range-picker'
import { useTopBar } from '@/components/top-bar-context'
import { AGENTS } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'

type ActiveSessionInfo = {
  session_id: string
  agent_type: string
  model: string
  last_event: string
  cost: number
  event_count: number
}

const ACTIVE_POLL_MS = 30_000

const formatModel = (model: string): string => {
  if (!model) return ''
  const parts = model.split('/')
  const name = parts[parts.length - 1]
  return name.length > 24 ? `${name.slice(0, 22)}...` : name
}

const formatCost = (value: number): string => `$${value.toFixed(2)}`

export const TopBar = () => {
  const { agentType, setAgentType, project, setProject, dateRange, setDateRange } = useTopBar()
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([])

  const fetchActive = useCallback(() => {
    fetch('/api/sessions/active')
      .then((r) => r.json())
      .then((data) => setActiveSessions(data.sessions ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchActive()
    const id = setInterval(fetchActive, ACTIVE_POLL_MS)
    return () => clearInterval(id)
  }, [fetchActive])

  return (
    <header className="flex h-10 shrink-0 items-center border-b bg-background px-4 gap-4">
      <div className="flex items-center gap-2">
        <AgentFilter value={agentType} onChange={setAgentType} />
      </div>
      <div className="flex items-center">
        <ProjectFilter value={project} onChange={setProject} />
      </div>

      {activeSessions.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-4 w-px bg-border" />
          {activeSessions.slice(0, 3).map((s) => {
            const config = AGENTS[s.agent_type as AgentType]
            return (
              <div key={s.session_id} className="flex items-center gap-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: config?.hex ?? '#8b5cf6' }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: config?.hex ?? '#8b5cf6' }}
                  />
                </span>
                <span className="font-medium" style={{ color: config?.hex ?? '#8b5cf6' }}>
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
            <span className="text-xs text-muted-foreground">+{activeSessions.length - 3} more</span>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
    </header>
  )
}
