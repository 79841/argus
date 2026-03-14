'use client'

import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { useTopBar } from '@/components/top-bar-context'

export const TopBar = () => {
  const { agentType, setAgentType, project, setProject } = useTopBar()

  return (
    <header className="flex h-10 shrink-0 items-center border-b bg-background px-4 gap-4">
      <div className="flex items-center gap-2">
        <AgentFilter value={agentType} onChange={setAgentType} />
      </div>
      <div className="flex items-center">
        <ProjectFilter value={project} onChange={setProject} />
      </div>
      <div className="ml-auto flex items-center text-xs text-muted-foreground">
        Last 7 days
      </div>
    </header>
  )
}
