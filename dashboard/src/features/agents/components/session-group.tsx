import { useLocale } from '@/shared/lib/i18n'
import { formatTime } from '@/shared/lib/format'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import type { AgentType } from '@/shared/lib/agents'
import type { AgentSession, AgentBlock as AgentBlockType } from '@/shared/lib/queries'
import { AgentBlock } from './agent-block'

type SessionGroupProps = {
  session: AgentSession
}

export const SessionGroup = ({ session }: SessionGroupProps) => {
  const { t } = useLocale()
  const shortId = session.session_id.slice(0, 4) + '...' + session.session_id.slice(-3)

  const mainAgent: AgentBlockType = {
    name: t('agents.mainAgent'),
    status: 'running',
    duration_ms: 0,
    timestamp: session.first_event,
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground/60">
        <span className="font-mono">#{shortId}</span>
        <span>·</span>
        <span>{formatTime(session.first_event)}~</span>
        <AgentBadge agent={session.agent_type as AgentType} />
      </div>
      <div className="flex flex-wrap gap-2">
        <AgentBlock agent={mainAgent} />
        {session.agents.map((agent, i) => (
          <AgentBlock key={`${agent.timestamp}-${i}`} agent={agent} />
        ))}
      </div>
    </div>
  )
}
