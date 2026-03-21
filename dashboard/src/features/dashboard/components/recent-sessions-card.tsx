'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { AgentDot } from '@/shared/components/ui/agent-dot'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { AGENTS } from '@/shared/lib/agents'
import { formatCost, formatDuration } from '@/shared/lib/format'

type RecentSession = {
  session_id: string
  agent_type: string
  project_name: string | null
  model: string | null
  cost: number
  duration_ms: number
}

type RecentSessionsCardProps = {
  sessions: RecentSession[]
  onViewAll: () => void
  onSelectSession: (sessionId: string) => void
}

export const RecentSessionsCard = ({ sessions, onViewAll, onSelectSession }: RecentSessionsCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
          <button
            onClick={onViewAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {sessions.length === 0 ? (
          <EmptyState title="No sessions" />
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s) => {
              const agent = AGENTS[s.agent_type as keyof typeof AGENTS]
              return (
                <div
                  key={s.session_id}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectSession(s.session_id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AgentDot agent={s.agent_type as keyof typeof AGENTS} size="xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium">{agent?.name ?? s.agent_type}</span>
                        {s.project_name && (
                          <span className="text-muted-foreground truncate max-w-[100px]">
                            · {s.project_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {s.model || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                    <span className="font-medium">{formatCost(s.cost)}</span>
                    <span className="text-muted-foreground">{formatDuration(s.duration_ms)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
