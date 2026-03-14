'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AgentType } from '@/lib/agents'

type TopBarContextValue = {
  agentType: AgentType
  setAgentType: (value: AgentType) => void
  project: string
  setProject: (value: string) => void
}

const TopBarContext = createContext<TopBarContextValue | null>(null)

export const useTopBar = (): TopBarContextValue => {
  const ctx = useContext(TopBarContext)
  if (!ctx) {
    throw new Error('useTopBar must be used within TopBarProvider')
  }
  return ctx
}

type TopBarProviderProps = {
  children: ReactNode
}

export const TopBarProvider = ({ children }: TopBarProviderProps) => {
  const [agentType, setAgentTypeState] = useState<AgentType>('all')
  const [project, setProjectState] = useState<string>('all')

  const setAgentType = useCallback((value: AgentType) => {
    setAgentTypeState(value)
  }, [])

  const setProject = useCallback((value: string) => {
    setProjectState(value)
  }, [])

  return (
    <TopBarContext.Provider value={{ agentType, setAgentType, project, setProject }}>
      {children}
    </TopBarContext.Provider>
  )
}
