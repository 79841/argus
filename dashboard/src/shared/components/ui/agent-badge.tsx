import type { AgentType } from '@/shared/lib/agents'
import { AGENTS } from '@/shared/lib/agents'
import { cn } from '@/shared/lib/utils'

type AgentBadgeProps = {
  agent: AgentType
  size?: 'sm' | 'md'
  className?: string
}

export const AgentBadge = ({ agent, size = 'sm', className }: AgentBadgeProps) => {
  const config = AGENTS[agent]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider text-white',
        size === 'sm' ? 'text-[10px] leading-[14px]' : 'text-xs leading-4',
        className
      )}
      style={{ backgroundColor: `var(--agent-${agent})` }}
    >
      {config.name}
    </span>
  )
}
