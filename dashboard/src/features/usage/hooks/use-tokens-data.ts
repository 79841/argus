'use client'

import { useState, useEffect } from 'react'
import { dailyService, overviewService } from '@/shared/services'
import { AGENTS } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/types/common'
import type { DailyStats, OverviewStats } from '@/lib/queries'
import type { DailyTokenPoint, AgentTokenPoint } from '@/types/usage'

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

type UseTokensDataParams = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type UseTokensDataResult = {
  daily: DailyTokenPoint[]
  agentTokens: AgentTokenPoint[]
  overview: OverviewStats | null
}

export const useTokensData = ({ agentType, project, dateRange }: UseTokensDataParams): UseTokensDataResult => {
  const [daily, setDaily] = useState<DailyTokenPoint[]>([])
  const [agentTokens, setAgentTokens] = useState<AgentTokenPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    dailyService.getDailyStats({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((rows) => {
        const typedRows = rows as DailyStats[]
        const byDate: Record<string, DailyTokenPoint> = {}
        for (const row of typedRows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, input: 0, output: 0, cache_read: 0 }
          byDate[row.date].input += row.input_tokens
          byDate[row.date].output += row.output_tokens
          byDate[row.date].cache_read += row.cache_read_tokens
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, { input: number; output: number; cache_read: number }> = {}
        for (const row of typedRows) {
          if (!agentMap[row.agent_type]) agentMap[row.agent_type] = { input: 0, output: 0, cache_read: 0 }
          agentMap[row.agent_type].input += row.input_tokens
          agentMap[row.agent_type].output += row.output_tokens
          agentMap[row.agent_type].cache_read += row.cache_read_tokens
        }
        setAgentTokens(
          AGENT_TYPES.map(id => ({
            agent: AGENTS[id].name,
            input: agentMap[id]?.input ?? 0,
            output: agentMap[id]?.output ?? 0,
            cache_read: agentMap[id]?.cache_read ?? 0,
            agentId: id,
          })).filter(a => a.input + a.output + a.cache_read > 0)
        )
      })
      .catch(() => {})

    overviewService.getOverview({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((data) => setOverview(data as OverviewStats))
      .catch(() => {})
  }, [agentType, project, dateRange])

  return { daily, agentTokens, overview }
}
