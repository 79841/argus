'use client'

import { useEffect, useState } from 'react'
import { overviewService, sessionsService } from '@/shared/services'
import { POLLING, AGENT_TYPES } from '@/shared/lib/constants'
import type { AgentType } from '@/shared/lib/agents'
import type { AgentStatus, AllTimeTotals, ActiveSessionInfo } from '@/shared/types/api'

type UseBottomBarDataReturn = {
  agents: AgentStatus[]
  totals: AllTimeTotals
  activeSessions: ActiveSessionInfo[]
  agentTypes: AgentType[]
}

export const useBottomBarData = (): UseBottomBarDataReturn => {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [totals, setTotals] = useState<AllTimeTotals>({ total_cost: 0, total_tokens: 0 })
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([])

  useEffect(() => {
    Promise.allSettled([
      overviewService.getIngestStatus(),
      overviewService.getOverview({ agent_type: 'all' }),
    ]).then(([ingestRes, overviewRes]) => {
      if (ingestRes.status === 'fulfilled') setAgents((ingestRes.value.agents ?? []) as AgentStatus[])
      if (overviewRes.status === 'fulfilled') {
        setTotals({
          total_cost: overviewRes.value.all_time_cost ?? 0,
          total_tokens: overviewRes.value.all_time_tokens ?? 0,
        })
      }
    })
  }, [])

  useEffect(() => {
    const fetchActive = () => {
      sessionsService.getActiveSessions()
        .then((data) => setActiveSessions((data.sessions ?? []) as ActiveSessionInfo[]))
        .catch(() => {})
    }
    fetchActive()
    const id = setInterval(fetchActive, POLLING.ACTIVE_SESSION_MS)
    return () => clearInterval(id)
  }, [])

  const agentTypes: AgentType[] = [...AGENT_TYPES]

  return {
    agents,
    totals,
    activeSessions,
    agentTypes,
  }
}
