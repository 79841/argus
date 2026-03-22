import path from 'path'
import fs from 'fs'
import { getDb } from '../../../src/shared/lib/db'
import { syncPricingFromLiteLLM } from '../../../src/shared/lib/pricing-sync'
import { connectAgents, disconnectAgents } from '../../../src/shared/lib/setup'
import { isPathSafe, resolvePath } from '../config/config.service'
import { AGENT_TYPES } from '../../../src/shared/lib/constants'

export const handleMutate = async (name: string, body?: unknown): Promise<unknown> => {
  switch (name) {
    case 'pricing-sync': {
      const db = getDb()
      const count = await syncPricingFromLiteLLM(db)
      return { synced: count }
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
