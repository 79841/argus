import { atom } from 'jotai'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/types/common'

export type { DateRange }

const todayISO = () => new Date().toISOString().slice(0, 10)

const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

const defaultDateRange: DateRange = {
  from: daysAgoISO(7),
  to: todayISO(),
}

export const agentTypeAtom = atom<AgentType>('all')
export const projectAtom = atom<string>('all')
export const dateRangeAtom = atom<DateRange>(defaultDateRange)
