import { cn } from '@/shared/lib/utils'
import { formatDuration } from '@/shared/lib/format'
import type { AgentBlock as AgentBlockType } from '@/shared/lib/queries'
import { getAgentStyle } from '../lib/agent-colors'

type AgentBlockProps = {
  agent: AgentBlockType
}

export const AgentBlock = ({ agent }: AgentBlockProps) => {
  const style = getAgentStyle(agent.name)
  const isRunning = agent.status === 'running'
  const isFailed = agent.status === 'failure'

  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2 min-w-[130px] max-w-[200px]',
        isRunning
          ? 'border border-dashed border-muted-foreground/30 bg-muted/20'
          : style.bg,
        isFailed && 'border border-red-500/30',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={cn(
            'inline-block h-[7px] w-[7px] shrink-0 rounded-full',
            style.dot,
            isRunning && 'animate-pulse',
          )}
        />
        <span className="text-xs font-semibold text-foreground/90 truncate">
          {agent.name}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {isRunning ? (
          <span className="animate-pulse">···</span>
        ) : (
          <>
            <span>{formatDuration(agent.duration_ms)}</span>
            <span className={isFailed ? 'text-red-500' : 'text-emerald-500'}>
              {isFailed ? '✗' : '✓'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
