import type { AgentType } from '@/lib/agents'
import { cn } from '@/lib/utils'

type AgentDotProps = {
  agent: AgentType
  size?: 'xs' | 'sm' | 'md'
  pulse?: boolean
  className?: string
}

const sizeMap = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
}

export const AgentDot = ({ agent, size = 'sm', pulse = false, className }: AgentDotProps) => {
  const dot = (
    <span
      className={cn('inline-block rounded-full flex-shrink-0', sizeMap[size], className)}
      style={{ backgroundColor: `var(--agent-${agent})` }}
    />
  )

  if (!pulse) return dot

  return (
    <span className="relative inline-flex">
      <span
        className={cn('absolute inline-block rounded-full animate-ping opacity-75', sizeMap[size])}
        style={{ backgroundColor: `var(--agent-${agent})` }}
      />
      {dot}
    </span>
  )
}
