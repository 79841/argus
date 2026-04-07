import { useLocale } from '@/shared/lib/i18n'
import { formatTime } from '@/shared/lib/format'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import type { AgentType } from '@/shared/lib/agents'
import type { AgentSession } from '@/shared/lib/queries'
import { AgentBlock } from './agent-block'

type SessionGroupProps = {
  session: AgentSession
}

export const SessionGroup = ({ session }: SessionGroupProps) => {
  const { t } = useLocale()
  const shortId = session.session_id.slice(0, 4) + '...' + session.session_id.slice(-3)

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <span className="font-mono">#{shortId}</span>
        <span>·</span>
        <span>{formatTime(session.first_event)}~</span>
        <span>·</span>
        <AgentBadge agent={session.agent_type as AgentType} />
      </div>
      {session.agents.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {session.agents.map((agent, i) => (
            <AgentBlock key={`${agent.timestamp}-${i}`} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/50 py-1">
          {t('agents.noAgents')}
        </div>
      )}
    </div>
  )
}
