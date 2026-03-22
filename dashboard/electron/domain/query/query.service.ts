import {
  getOverviewStats,
  getAllTimeStats,
  getOverviewDelta,
  getAgentTodaySummaries,
  getDailyStats,
  getSessions,
  getSessionDetail,
  getActiveSessions,
  getModelUsage,
  getEfficiencyStats,
  getEfficiencyComparison,
  getToolUsageStats,
  getToolDetailStats,
  getDailyToolStats,
  getIndividualToolStats,
  getProjects,
  getProjectCosts,
  getProjectDetailStats,
  getProjectDailyCosts,
  getProjectComparison,
  getIngestStatus,
  getAgentDailyCosts,
  getConfigCompareStats,
  getHighCostSessions,
  getModelCostEfficiency,
  getSuggestionMetrics,
} from '../../../src/shared/lib/queries'
import { generateSuggestions } from '../../../src/shared/lib/suggestions'
import { getDb } from '../../../src/shared/lib/db'
import { scanRegisteredTools } from '../../../src/shared/lib/registered-tools'
import { getConfigHistory } from '../../../src/shared/lib/config-tracker'
import { getSetupStatus } from '../../../src/shared/lib/setup'
import { str, num } from '../../infrastructure/helpers'
import { handleConfigGet, getProjectRoot } from '../config/config.service'
import type { QueryParams } from '../config/config.types'

export const handleQuery = async (name: string, params?: QueryParams): Promise<unknown> => {
  // sessions/{id} 패턴 처리
  if (name.startsWith('sessions/') && name !== 'sessions/active') {
    const id = decodeURIComponent(name.slice('sessions/'.length))
    return getSessionDetail(id)
  }

  // projects/{name} 패턴 처리 (projects/registry 등 예약 경로 제외)
  if (name.startsWith('projects/') && !name.startsWith('projects/registry')) {
    const projectName = decodeURIComponent(name.slice('projects/'.length))
    const [stats, daily] = await Promise.all([
      getProjectDetailStats(projectName),
      getProjectDailyCosts(30),
    ])
    const projectDaily = daily.filter((d) => d.project_name === projectName)
    return { stats, daily: projectDaily }
  }

  switch (name) {
    case 'overview': {
      const agentType = str(params?.agent_type, 'all')
      const project = str(params?.project, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      const [data, allTime, delta, agentSummaries] = await Promise.all([
        getOverviewStats(agentType, project, from, to),
        getAllTimeStats(agentType, project),
        getOverviewDelta(agentType, project),
        getAgentTodaySummaries(),
      ])
      return {
        ...data,
        all_time_cost: allTime.total_cost,
        all_time_tokens: allTime.total_tokens,
        delta,
        agent_summaries: agentSummaries,
      }
    }

    case 'daily': {
      const agentType = str(params?.agent_type, 'all')
      const days = num(params?.days, 30)
      const project = str(params?.project, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      return getDailyStats(agentType, days, project, from, to)
    }

    case 'sessions': {
      const agentType = str(params?.agent_type, 'all')
      const project = str(params?.project, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      const limit = num(params?.limit, 100)
      return getSessions(agentType, project, from, to, limit)
    }

    case 'sessions/active':
      return { sessions: await getActiveSessions() }

    case 'models': {
      const agentType = str(params?.agent_type, 'all')
      const project = str(params?.project, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      return getModelUsage(agentType, project, from, to)
    }

    case 'efficiency': {
      const days = num(params?.days, 7)
      const project = str(params?.project, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      const [data, comparison] = await Promise.all([
        getEfficiencyStats(days, project, from, to),
        getEfficiencyComparison(days, project, from, to),
      ])
      return { data, comparison }
    }

    case 'tools': {
      const agentType = str(params?.agent_type, 'all')
      const rawDays = num(params?.days, 7)
      const days = rawDays < 1 ? 7 : rawDays
      const project = str(params?.project, 'all')
      const detail = params?.detail === true || params?.detail === 'true'
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined

      if (detail) {
        const [tools, daily, individual] = await Promise.all([
          getToolDetailStats(agentType, days, project, from, to),
          getDailyToolStats(agentType, days, project, from, to),
          getIndividualToolStats(days, project, from, to),
        ])
        return { tools, daily, individual }
      }

      const tools = await getToolUsageStats(agentType, days, project, from, to)
      return { tools }
    }

    case 'tools/registered': {
      const tools = scanRegisteredTools()
      return { tools }
    }

    case 'projects': {
      const view = str(params?.view)
      if (view === 'comparison') {
        return getProjectComparison()
      }
      const agentType = str(params?.agent_type, 'all')
      const from = params?.from ? str(params.from) : undefined
      const to = params?.to ? str(params.to) : undefined
      if (agentType !== 'all' || from) {
        return getProjectCosts(agentType, from, to)
      }
      return getProjects()
    }

    case 'insights': {
      const days = num(params?.days, 7)
      const limit = num(params?.limit, 10)
      const [highCostSessions, modelEfficiency] = await Promise.all([
        getHighCostSessions(days, limit),
        getModelCostEfficiency(days),
      ])
      return { highCostSessions, modelEfficiency }
    }

    case 'suggestions': {
      const days = num(params?.days, 7)
      const metrics = await getSuggestionMetrics(days)
      const suggestions = generateSuggestions(metrics)
      return { suggestions, metrics }
    }

    case 'ingest-status':
      return { agents: await getIngestStatus() }

    case 'daily-costs':
      return { costs: await getAgentDailyCosts() }

    case 'config-history': {
      const days = num(params?.days, 30)
      return getConfigHistory(getProjectRoot(), days)
    }

    case 'config-history/compare': {
      const date = str(params?.date)
      const days = num(params?.days, 7)
      if (!date) throw new Error('date parameter is required')
      return getConfigCompareStats(date, days)
    }

    case 'projects/registry': {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM project_registry ORDER BY project_name').all()
      return { projects: rows }
    }

    case 'config': {
      const filePath = params?.path ? str(params.path) : null
      return handleConfigGet(filePath, params)
    }

    case 'setup/status':
      return { agents: getSetupStatus() }

    default:
      throw new Error(`Unknown query: ${name}`)
  }
}
