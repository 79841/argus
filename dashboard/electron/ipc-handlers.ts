import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
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
  getIngestStatus,
  getAgentDailyCosts,
  getConfigCompareStats,
  getHighCostSessions,
  getModelCostEfficiency,
  getBudgetStatus,
} from '../src/lib/queries'
import { getDb } from '../src/lib/db'
import { scanRegisteredTools } from '../src/lib/registered-tools'
import { getConfigHistory } from '../src/lib/config-tracker'
import { syncPricingFromLiteLLM } from '../src/lib/pricing-sync'

type QueryParams = Record<string, unknown>

const str = (v: unknown, fallback = ''): string =>
  v !== undefined && v !== null ? String(v) : fallback

const num = (v: unknown, fallback: number): number => {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

const handleQuery = async (name: string, params?: QueryParams): Promise<unknown> => {
  // sessions/{id} 패턴 처리
  if (name.startsWith('sessions/') && name !== 'sessions/active') {
    const id = decodeURIComponent(name.slice('sessions/'.length))
    return getSessionDetail(id)
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
      const [highCostSessions, modelEfficiency, budgetStatus] = await Promise.all([
        getHighCostSessions(days, limit),
        getModelCostEfficiency(days),
        getBudgetStatus(),
      ])
      return { highCostSessions, modelEfficiency, budgetStatus }
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

    case 'settings/limits': {
      const db = getDb()
      const rows = db.prepare('SELECT agent_type, daily_cost_limit, monthly_cost_limit FROM agent_limits').all()
      return { limits: rows }
    }

    case 'config': {
      const filePath = params?.path ? str(params.path) : null
      return handleConfigGet(filePath)
    }

    default:
      throw new Error(`Unknown query: ${name}`)
  }
}

const handleMutate = async (name: string, body?: unknown): Promise<unknown> => {
  switch (name) {
    case 'pricing-sync': {
      const db = getDb()
      const count = await syncPricingFromLiteLLM(db)
      return { synced: count }
    }

    case 'settings/limits': {
      const payload = body as { limits: Array<{ agent_type: string; daily_cost_limit: number; monthly_cost_limit: number }> }
      const db = getDb()
      const upsert = db.prepare(`
        INSERT INTO agent_limits (agent_type, daily_cost_limit, monthly_cost_limit)
        VALUES (?, ?, ?)
        ON CONFLICT(agent_type) DO UPDATE SET
          daily_cost_limit = excluded.daily_cost_limit,
          monthly_cost_limit = excluded.monthly_cost_limit
      `)
      const tx = db.transaction(() => {
        for (const limit of payload.limits) {
          upsert.run(limit.agent_type, limit.daily_cost_limit, limit.monthly_cost_limit)
        }
      })
      tx()
      return { ok: true }
    }

    case 'config': {
      const { path: filePath, content } = body as { path: string; content: string }
      if (!filePath || typeof content !== 'string') {
        throw new Error('path and content are required')
      }
      if (!isPathSafe(filePath)) {
        throw new Error('Invalid file path')
      }
      const fullPath = resolvePath(filePath)
      const dir = path.dirname(fullPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(fullPath, content, 'utf-8')
      return { success: true, path: filePath }
    }

    default:
      throw new Error(`Unknown mutate: ${name}`)
  }
}

// config 라우트용 헬퍼 함수들
const getProjectRoot = (): string => path.resolve(__dirname, '..', '..', '..')
const getUserHome = (): string => os.homedir()

const PROJECT_STATIC_FILES = [
  { agent: 'claude', path: 'CLAUDE.md' },
  { agent: 'claude', path: '.claude/settings.json' },
  { agent: 'claude', path: '.mcp.json' },
  { agent: 'codex', path: 'codex.md' },
  { agent: 'codex', path: 'AGENTS.md' },
  { agent: 'gemini', path: 'GEMINI.md' },
]

const USER_STATIC_FILES = [
  { agent: 'claude', path: '~/.claude/settings.json' },
  { agent: 'codex', path: '~/.codex/config.toml' },
  { agent: 'codex', path: '~/.codex/instructions.md' },
  { agent: 'gemini', path: '~/.gemini/settings.json' },
]

const resolvePath = (filePath: string): string => {
  if (filePath.startsWith('~/')) {
    return path.join(getUserHome(), filePath.slice(2))
  }
  return path.join(getProjectRoot(), filePath)
}

const isProjectPath = (filePath: string): boolean => !filePath.startsWith('~/')

const isPathSafe = (filePath: string): boolean => {
  if (filePath.startsWith('~/')) {
    const resolved = path.resolve(resolvePath(filePath))
    const home = getUserHome()
    return resolved.startsWith(home) && !filePath.includes('..')
  }
  const resolved = path.resolve(getProjectRoot(), filePath)
  const root = getProjectRoot()
  return resolved.startsWith(root) && !filePath.includes('..')
}

const scanDynamicFiles = (root: string): Array<{ agent: string; path: string }> => {
  const dynamic: Array<{ agent: string; path: string }> = []

  const agentsDir = path.join(root, '.claude', 'agents')
  if (fs.existsSync(agentsDir)) {
    try {
      const entries = fs.readdirSync(agentsDir)
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          dynamic.push({ agent: 'claude', path: `.claude/agents/${entry}` })
        }
      }
    } catch {
      // ignore
    }
  }

  const skillsDir = path.join(root, '.claude', 'skills')
  if (fs.existsSync(skillsDir)) {
    try {
      const skillNames = fs.readdirSync(skillsDir)
      for (const skillName of skillNames) {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md')
        if (fs.existsSync(skillFile)) {
          dynamic.push({ agent: 'claude', path: `.claude/skills/${skillName}/SKILL.md` })
        }
      }
    } catch {
      // ignore
    }
  }

  return dynamic
}

const handleConfigGet = (filePath: string | null): unknown => {
  if (!filePath) {
    const root = getProjectRoot()
    const dynamicFiles = scanDynamicFiles(root)
    const allProjectFiles = [...PROJECT_STATIC_FILES, ...dynamicFiles]

    const projectFiles = allProjectFiles
      .filter((f) => fs.existsSync(path.join(root, f.path)))
      .map((f) => ({
        path: f.path,
        agent: f.agent,
        scope: 'project' as const,
        exists: true,
      }))

    const userFiles = USER_STATIC_FILES
      .filter((f) => fs.existsSync(resolvePath(f.path)))
      .map((f) => ({
        path: f.path,
        agent: f.agent,
        scope: 'user' as const,
        exists: true,
      }))

    return { files: [...projectFiles, ...userFiles] }
  }

  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path')
  }

  const fullPath = resolvePath(filePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found')
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const scope = isProjectPath(filePath) ? 'project' : 'user'
  return { path: filePath, content, scope }
}

export const registerIpcHandlers = (): void => {
  ipcMain.handle('db:query', async (_event, name: string, params?: QueryParams) => {
    try {
      return await handleQuery(name, params)
    } catch (err) {
      throw new Error(`IPC query "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('db:mutate', async (_event, name: string, body?: unknown) => {
    try {
      return await handleMutate(name, body)
    } catch (err) {
      throw new Error(`IPC mutate "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
}
