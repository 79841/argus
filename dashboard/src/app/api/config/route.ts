import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { errorResponse, serverError } from '@/shared/lib/api-utils'
import {
  getUserHome,
  resolveUserPath,
  isPathSafe,
  scanDirFiles,
  scanDynamicFiles,
  type RegistryRow,
} from '@/shared/lib/config-scanner'
import { getDb } from '@/shared/lib/db'

const getRegisteredProjects = (): RegistryRow[] => {
  try {
    const db = getDb()
    return db.prepare('SELECT project_name, project_path FROM project_registry ORDER BY project_name').all() as RegistryRow[]
  } catch {
    return []
  }
}

const INSTRUCTION_FILE_PATTERNS = [
  { agent: 'claude', file: 'CLAUDE.md' },
  { agent: 'claude', file: '.claude/CLAUDE.md' },
  { agent: 'claude', file: 'REVIEW.md' },
  { agent: 'codex', file: 'AGENTS.md' },
  { agent: 'codex', file: 'AGENTS.override.md' },
  { agent: 'gemini', file: 'GEMINI.md' },
] as const

const USER_STATIC_FILES = [
  { agent: 'claude', path: '~/.claude/CLAUDE.md' },
  { agent: 'codex', path: '~/.codex/AGENTS.md' },
  { agent: 'codex', path: '~/.codex/AGENTS.override.md' },
  { agent: 'gemini', path: '~/.gemini/GEMINI.md' },
]

const scanUserDynamicFiles = (): Array<{ agent: string; path: string }> => {
  const home = getUserHome()
  return [
    ...scanDirFiles(path.join(home, '.claude', 'rules'), '.md', 'claude', '~/.claude/rules'),
    ...scanDirFiles(path.join(home, '.codex', 'rules'), '.rules', 'codex', '~/.codex/rules'),
  ]
}

const getProjectFiles = (projectRoot: string, projectName: string) => {
  const staticFiles = INSTRUCTION_FILE_PATTERNS
    .filter(({ file }) => fs.existsSync(path.join(projectRoot, file)))
    .map(({ agent, file }) => ({
      path: file,
      agent,
      scope: 'project' as const,
      exists: true,
      projectRoot,
      projectName,
    }))

  const dynamicFiles = scanDynamicFiles(projectRoot)
    .filter((f) => fs.existsSync(path.join(projectRoot, f.path)))
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

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')
    const projectRoot = request.nextUrl.searchParams.get('projectRoot')

    if (!filePath) {
      const registered = getRegisteredProjects()

      const allProjectFiles = registered.flatMap(({ project_name, project_path }) =>
        getProjectFiles(project_path, project_name)
      )

      const staticUserFiles = USER_STATIC_FILES
        .filter((f) => fs.existsSync(resolveUserPath(f.path)))
        .map((f) => ({
          path: f.path,
          agent: f.agent,
          scope: 'user' as const,
          exists: true,
          projectRoot: '',
          projectName: '',
        }))

      const staticUserPaths = new Set(staticUserFiles.map((f) => f.path))

      const dynamicUserFiles = scanUserDynamicFiles()
        .filter((f) => !staticUserPaths.has(f.path) && fs.existsSync(resolveUserPath(f.path)))
        .map((f) => ({
          path: f.path,
          agent: f.agent,
          scope: 'user' as const,
          exists: true,
          projectRoot: '',
          projectName: '',
        }))

      const userFiles = [...staticUserFiles, ...dynamicUserFiles]

      return NextResponse.json({ files: [...allProjectFiles, ...userFiles] })
    }

    if (!isPathSafe(filePath, projectRoot ?? undefined)) {
      return errorResponse('Invalid file path')
    }

    const fullPath = filePath.startsWith('~/')
      ? resolveUserPath(filePath)
      : projectRoot
        ? path.join(projectRoot, filePath)
        : null

    if (!fullPath || !fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found', content: '' }, { status: 404 })
    }

    const content = fs.readFileSync(fullPath, 'utf-8').replace(/\r\n/g, '\n')
    const scope = filePath.startsWith('~/') ? 'user' : 'project'
    return NextResponse.json({ path: filePath, content, scope })
  } catch (error) {
    return serverError('/api/config GET', error)
  }
}

export const dynamic = 'force-dynamic'
