import { cn } from '@/shared/lib/utils'
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
  const hasSubAgents = session.agents.length > 0

  return (
    <div className={cn(
      'rounded-2xl px-4 py-3',
      'bg-muted/20',
    )}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium text-foreground/80">{t('agents.mainAgent')}</span>
        <span className="font-mono text-muted-foreground/60">#{shortId}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{formatTime(session.first_event)}~</span>
        <span className="ml-auto">
          <AgentBadge agent={session.agent_type as AgentType} />
        </span>
      </div>

      {hasSubAgents && (
        <div className="mt-3 flex flex-wrap gap-2">
          {session.agents.map((agent, i) => (
            <AgentBlock key={`${agent.timestamp}-${i}`} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
