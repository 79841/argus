'use client'

import { useState, useEffect } from 'react'
import { dailyService, overviewService, projectsService } from '@/shared/services'
import { AGENTS } from '@/shared/lib/agents'
import type { AgentType } from '@/shared/lib/agents'
import type { DateRange } from '@/shared/types/common'
import type { DailyStats, OverviewStats } from '@/shared/lib/queries'
import type { DailyCostPoint, AgentCostPoint, ProjectCostPoint } from '@/features/usage/types/usage'

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

type UseCostDataParams = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type UseCostDataResult = {
  daily: DailyCostPoint[]
  agentCosts: AgentCostPoint[]
  projectCosts: ProjectCostPoint[]
  overview: OverviewStats | null
  prevOverview: OverviewStats | null
}

export const useCostData = ({ agentType, project, dateRange }: UseCostDataParams): UseCostDataResult => {
  const [daily, setDaily] = useState<DailyCostPoint[]>([])
  const [agentCosts, setAgentCosts] = useState<AgentCostPoint[]>([])
  const [projectCosts, setProjectCosts] = useState<ProjectCostPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [prevOverview, setPrevOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    dailyService.getDailyStats({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((rows) => {
        const typedRows = rows as DailyStats[]
        const byDate: Record<string, DailyCostPoint> = {}
        for (const row of typedRows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, claude: 0, codex: 0, gemini: 0, total: 0 }
          const point = byDate[row.date]
          point[row.agent_type as 'claude' | 'codex' | 'gemini'] = row.cost
          point.total += row.cost
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, number> = {}
        for (const row of typedRows) {
          agentMap[row.agent_type] = (agentMap[row.agent_type] ?? 0) + row.cost
        }
        setAgentCosts(
          AGENT_TYPES.map(id => ({ agent: AGENTS[id].name, cost: agentMap[id] ?? 0, agentId: id }))
            .filter(a => a.cost > 0)
        )
      })
      .catch(() => {})

    overviewService.getOverview({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((data) => setOverview(data as OverviewStats))
      .catch(() => {})

    const from = new Date(dateRange.from)
    const to = new Date(dateRange.to)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - days + 1)
    overviewService.getOverview({
      agent_type: agentType,
      project,
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    })
      .then((data) => setPrevOverview(data as OverviewStats))
      .catch(() => {})

    projectsService.getProjects({ agent_type: agentType, from: dateRange.from, to: dateRange.to })
      .then((data) => {
        const typedData = data as Array<{ project_name: string; total_cost: number }>
        setProjectCosts(typedData.map(d => ({ project: d.project_name, cost: d.total_cost })))
      })
      .catch(() => {})
  }, [agentType, project, dateRange])

  return { daily, agentCosts, projectCosts, overview, prevOverview }
}
