import path from 'path'
import fs from 'fs'
import { getDb } from '../../../src/lib/db'
import { syncPricingFromLiteLLM } from '../../../src/lib/pricing-sync'
import { connectAgents, disconnectAgents } from '../../../src/lib/setup'
import { isPathSafe, resolvePath } from '../config/config.service'
import { AGENT_TYPES } from '../../../src/shared/lib/constants'

export const handleMutate = async (name: string, body?: unknown): Promise<unknown> => {
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

    case 'projects/registry/delete': {
      const { name: deleteName } = body as { name: string }
      if (!deleteName) throw new Error('name is required')
      const deleteDb = getDb()
      deleteDb.prepare('DELETE FROM project_registry WHERE project_name = ?').run(deleteName)
      return { success: true }
    }

    case 'projects/registry': {
      const { name: projectName, path: projectPath } = body as { name: string; path: string }
      if (!projectName || !projectPath) {
        throw new Error('name and path are required')
      }
      const resolved = path.resolve(projectPath)
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new Error('Directory not found')
      }
      const db = getDb()
      db.prepare(
        'INSERT OR REPLACE INTO project_registry (project_name, project_path) VALUES (?, ?)'
      ).run(projectName, resolved)
      return { success: true, name: projectName, path: resolved }
    }

    case 'setup/connect': {
      const { agents, endpoint } = body as { agents: string[]; endpoint?: string }
      const validAgents = agents.filter((a: string) => (AGENT_TYPES as readonly string[]).includes(a)) as Array<'claude' | 'codex' | 'gemini'>
      return { results: connectAgents(validAgents, endpoint ?? 'http://localhost:9845') }
    }

    case 'setup/disconnect': {
      const { agents } = body as { agents: string[] }
      const validAgents = agents.filter((a: string) => (AGENT_TYPES as readonly string[]).includes(a)) as Array<'claude' | 'codex' | 'gemini'>
      return { results: disconnectAgents(validAgents) }
    }

    default:
      throw new Error(`Unknown mutate: ${name}`)
  }
}
