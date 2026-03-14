'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AgentType } from '@/lib/agents'

export type DateRange = {
  from: string
  to: string
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

const defaultDateRange = (): DateRange => ({
  from: daysAgoISO(7),
  to: todayISO(),
})

type TopBarContextValue = {
  agentType: AgentType
  setAgentType: (value: AgentType) => void
  project: string
  setProject: (value: string) => void
  dateRange: DateRange
  setDateRange: (value: DateRange) => void
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
  const [dateRange, setDateRangeState] = useState<DateRange>(defaultDateRange)

  const setAgentType = useCallback((value: AgentType) => {
    setAgentTypeState(value)
  }, [])

  const setProject = useCallback((value: string) => {
    setProjectState(value)
  }, [])

  const setDateRange = useCallback((value: DateRange) => {
    setDateRangeState(value)
  }, [])

  return (
    <TopBarContext.Provider value={{ agentType, setAgentType, project, setProject, dateRange, setDateRange }}>
      {children}
    </TopBarContext.Provider>
  )
}
