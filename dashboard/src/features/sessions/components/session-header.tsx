import { Badge } from '@/shared/components/ui/badge'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { shortenModel, parseModels } from '@/shared/lib/format'
import type { SessionSummary } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'

export type SessionHeaderProps = {
  summary: SessionSummary
  sessionId: string
}

export const SessionHeader = ({ summary, sessionId }: SessionHeaderProps) => {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AgentBadge agent={summary.agent_type as AgentType} />
        <div className="flex flex-wrap gap-1">
          {parseModels(summary.model || '').map((m) => (
            <Badge key={m} variant="outline" className="text-xs">
              {shortenModel(m)}
            </Badge>
          ))}
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1">
        <span className="font-mono text-xs text-muted-foreground">
          {sessionId.slice(0, 20)}
          {sessionId.length > 20 ? '…' : ''}
        </span>
        {summary.project_name && (
          <span className="text-xs text-muted-foreground">{summary.project_name}</span>
        )}
      </div>
    </div>
  )
}
