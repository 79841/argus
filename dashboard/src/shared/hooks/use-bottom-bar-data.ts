'use client'

import { useEffect, useState } from 'react'
import { overviewService, settingsService, sessionsService } from '@/shared/services'
import { POLLING, AGENT_TYPES } from '@/shared/lib/constants'
import type { AgentType } from '@/lib/agents'
import type { AgentStatus, AllTimeTotals, AgentLimit, AgentDailyCost, ActiveSessionInfo } from '@/types/api'

type LimitBar = {
  type: AgentType
  pct: number
  cost: number
  limit: number
  exceeded: boolean
}

type UseBottomBarDataReturn = {
  agents: AgentStatus[]
  totals: AllTimeTotals
  activeSessions: ActiveSessionInfo[]
  limitBars: LimitBar[]
  agentTypes: AgentType[]
}

export const useBottomBarData = (): UseBottomBarDataReturn => {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [totals, setTotals] = useState<AllTimeTotals>({ total_cost: 0, total_tokens: 0 })
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([])
  const [limits, setLimits] = useState<AgentLimit[]>([])
  const [dailyCosts, setDailyCosts] = useState<AgentDailyCost[]>([])

  useEffect(() => {
    overviewService.getIngestStatus()
      .then((data) => setAgents((data.agents ?? []) as AgentStatus[]))
      .catch(() => {})
    overviewService.getOverview({ agent_type: 'all' })
      .then((data) => {
        setTotals({
          total_cost: data.all_time_cost ?? 0,
          total_tokens: data.all_time_tokens ?? 0,
        })
      })
      .catch(() => {})
    settingsService.getLimits()
      .then((data) => setLimits((data.limits ?? []) as AgentLimit[]))
      .catch(() => {})
    overviewService.getDailyCosts()
      .then((data) => setDailyCosts((data.costs ?? []) as AgentDailyCost[]))
      .catch(() => {})
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

  const limitBars = agentTypes
    .map((type) => {
      const limit = limits.find((l) => l.agent_type === type)
      if (!limit || limit.daily_cost_limit <= 0) return null
      const cost = dailyCosts.find((c) => c.agent_type === type)?.daily_cost ?? 0
      const pct = Math.min((cost / limit.daily_cost_limit) * 100, 100)
      const exceeded = cost >= limit.daily_cost_limit
      return { type, pct, cost, limit: limit.daily_cost_limit, exceeded }
    })
    .filter(Boolean) as LimitBar[]

  return {
    agents,
    totals,
    activeSessions,
    limitBars,
    agentTypes,
  }
}
