'use client'

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { AGENT_LIST } from '@/shared/lib/agents'
import type { AgentType } from '@/shared/lib/agents'

type AgentFilterProps = {
  value: AgentType
  onChange: (value: AgentType) => void
}

const TAB_COLORS: Record<AgentType, string> = {
  all: 'data-[state=active]:bg-violet-500/80 data-[state=active]:text-white',
  codex: 'data-[state=active]:bg-emerald-500/80 data-[state=active]:text-white',
  claude: 'data-[state=active]:bg-orange-500/80 data-[state=active]:text-white',
  gemini: 'data-[state=active]:bg-blue-500/80 data-[state=active]:text-white',
}

export const AgentFilter = ({ value, onChange }: AgentFilterProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AgentType)}>
      <TabsList>
        {AGENT_LIST.map((agent) => (
          <TabsTrigger
            key={agent.id}
            value={agent.id}
            className={TAB_COLORS[agent.id]}
          >
            {agent.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
