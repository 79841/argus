import path from 'path'
import fs from 'fs'
import os from 'os'
import { getDb } from '../../../src/lib/db'
import { str } from '../../infrastructure/helpers'
import { PROJECT_STATIC_FILES, USER_STATIC_FILES } from './config.constants'
import type { QueryParams, RegistryRow, ProjectFileEntry, UserFileEntry } from './config.types'

export const getProjectRoot = (): string => path.resolve(__dirname, '..', '..', '..', '..')

export const getUserHome = (): string => os.homedir()

export const resolvePath = (filePath: string): string => {
  if (filePath.startsWith('~/')) {
    return path.join(getUserHome(), filePath.slice(2))
  }
  return path.join(getProjectRoot(), filePath)
}

export const isPathSafe = (filePath: string): boolean => {
  if (filePath.startsWith('~/')) {
    const resolved = path.resolve(resolvePath(filePath))
    const home = getUserHome()
    return resolved.startsWith(home) && !filePath.includes('..')
  }
  const resolved = path.resolve(getProjectRoot(), filePath)
  const root = getProjectRoot()
  return resolved.startsWith(root) && !filePath.includes('..')
}

export const scanDynamicFiles = (root: string): Array<{ agent: string; path: string }> => {
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

export const getRegisteredProjects = (): RegistryRow[] => {
  try {
    const db = getDb()
    return db.prepare('SELECT project_name, project_path FROM project_registry ORDER BY project_name').all() as RegistryRow[]
  } catch {
    return []
  }
}

export const getProjectFiles = (projectRoot: string, projectName: string): ProjectFileEntry[] => {
  const staticFiles = PROJECT_STATIC_FILES
    .filter(({ path: p }) => fs.existsSync(path.join(projectRoot, p)))
    .map(({ agent, path: p }) => ({
      path: p,
      agent,
      scope: 'project' as const,
      exists: true,
      projectRoot,
      projectName,
    }))

  const dynamicFiles = scanDynamicFiles(projectRoot)
    .map((f) => ({
      path: f.path,
      agent: f.agent,
      scope: 'project' as const,
      exists: true,
      projectRoot,
      projectName,
    }))

  return [...staticFiles, ...dynamicFiles]
}

export const handleConfigGet = (filePath: string | null, params?: QueryParams): unknown => {
  if (!filePath) {
    const registered = getRegisteredProjects()

    const projectFiles = registered.flatMap(({ project_name, project_path }) =>
      getProjectFiles(project_path, project_name)
    )

    const userFiles: UserFileEntry[] = USER_STATIC_FILES
      .filter((f) => fs.existsSync(resolvePath(f.path)))
      .map((f) => ({
        path: f.path,
        agent: f.agent,
        scope: 'user' as const,
        exists: true,
      }))

    return { files: [...projectFiles, ...userFiles] }
  }

  const projectRoot = params?.projectRoot ? str(params.projectRoot) : null

  const readFileSafe = (fullPath: string): string => {
    try {
      return fs.readFileSync(fullPath, 'utf-8')
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') throw new Error('File not found')
      throw e
    }
  }

  if (filePath.startsWith('~/')) {
    const fullPath = resolvePath(filePath)
    return { path: filePath, content: readFileSafe(fullPath), scope: 'user' }
  }

  if (projectRoot) {
    const resolved = path.resolve(projectRoot, filePath)
    if (!resolved.startsWith(path.resolve(projectRoot))) throw new Error('Invalid file path')
    return { path: filePath, content: readFileSafe(resolved), scope: 'project' }
  }

  if (!isPathSafe(filePath)) throw new Error('Invalid file path')
  const fullPath = resolvePath(filePath)
  return { path: filePath, content: readFileSafe(fullPath), scope: 'project' }
}
