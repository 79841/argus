import { atom } from 'jotai'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/types/common'
import { todayISO, daysAgoISO } from '@/shared/lib/format'

export type { DateRange }

const defaultDateRange: DateRange = {
  from: daysAgoISO(7),
  to: todayISO(),
}

export const agentTypeAtom = atom<AgentType>('all')
export const projectAtom = atom<string>('all')
export const dateRangeAtom = atom<DateRange>(defaultDateRange)
