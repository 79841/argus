'use client'

import { useAtom } from 'jotai'
import type { AgentType } from '@/shared/lib/agents'
import { agentTypeAtom, projectAtom, dateRangeAtom } from '@/shared/atoms'
import type { DateRange } from '@/shared/atoms'
import type { ReactNode } from 'react'

export type { DateRange }

export type TopBarContextValue = {
  agentType: AgentType
  setAgentType: (value: AgentType) => void
  project: string
  setProject: (value: string) => void
  dateRange: DateRange
  setDateRange: (value: DateRange) => void
}

export const useTopBar = (): TopBarContextValue => {
  const [agentType, setAgentType] = useAtom(agentTypeAtom)
  const [project, setProject] = useAtom(projectAtom)
  const [dateRange, setDateRange] = useAtom(dateRangeAtom)

  return {
    agentType,
    setAgentType,
    project,
    setProject,
    dateRange,
    setDateRange,
  }
}

type TopBarProviderProps = {
  children: ReactNode
}

// jotai는 기본적으로 Provider 없이도 동작하므로 단순 패스스루
export const TopBarProvider = ({ children }: TopBarProviderProps) => {
  return <>{children}</>
}
