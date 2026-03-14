'use client'

import { useState, useEffect } from 'react'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { AgentType } from '@/lib/agents'
import type { SessionRow } from '@/lib/queries'

const AGENT_BADGE_CLASSES: Record<string, string> = {
  codex: 'bg-emerald-500 text-white',
  claude: 'bg-orange-500 text-white',
  gemini: 'bg-blue-500 text-white',
}

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const formatCost = (value: number): string => {
  return `$${value.toFixed(3)}`
}

const formatDuration = (ms: number): string => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}

export default function SessionsPage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sessions?agent_type=${agentType}&project=${project}`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data)
        setLoading(false)
      })
      .catch(() => {
        setSessions([])
        setLoading(false)
      })
  }, [agentType, project])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <div className="flex items-center gap-3">
          <ProjectFilter value={project} onChange={setProject} />
          <AgentFilter value={agentType} onChange={setAgentType} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          No sessions found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Model</th>
                <th className="px-4 py-3 text-left font-medium">Session ID</th>
                <th className="px-4 py-3 text-left font-medium">Started</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Input Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Output Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.session_id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Badge className={AGENT_BADGE_CLASSES[session.agent_type] ?? 'bg-violet-500 text-white'}>
                      {session.agent_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.project_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.model}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {session.session_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(session.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <Tooltip>
                      <TooltipTrigger>
                        {formatCost(session.cost)}
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        {session.agent_type === 'claude'
                          ? 'API에서 직접 제공 (cost_usd)'
                          : 'LiteLLM 가격 DB 기반 토큰 계산'}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatTokens(session.input_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatTokens(session.output_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatDuration(session.duration_ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
