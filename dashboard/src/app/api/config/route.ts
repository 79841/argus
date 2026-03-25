import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '@/shared/lib/db'
import { errorResponse, serverError } from '@/shared/lib/api-utils'

const getUserHome = () => os.homedir()

const CONFIG_FILE_PATTERNS = [
  { agent: 'claude', file: 'CLAUDE.md' },
  { agent: 'claude', file: '.claude/settings.json' },
  { agent: 'claude', file: '.mcp.json' },
  { agent: 'codex', file: 'codex.md' },
  { agent: 'codex', file: 'AGENTS.md' },
  { agent: 'gemini', file: 'GEMINI.md' },
] as const

const USER_STATIC_FILES = [
  { agent: 'claude', path: '~/.claude/settings.json' },
  { agent: 'codex', path: '~/.codex/config.toml' },
  { agent: 'codex', path: '~/.codex/instructions.md' },
  { agent: 'gemini', path: '~/.gemini/settings.json' },
]

const resolveUserPath = (filePath: string): string =>
  path.join(getUserHome(), filePath.slice(2))

const normalizePath = (p: string): string =>
  process.platform === 'win32' ? p.toLowerCase() : p

const isPathSafe = (filePath: string, projectRoot?: string): boolean => {
  if (filePath.startsWith('~/')) {
    const resolved = normalizePath(path.resolve(resolveUserPath(filePath)))
    const home = normalizePath(getUserHome())
    return resolved.startsWith(home + path.sep) || resolved === home
  }
  if (!projectRoot) return false
  const normalizedRoot = normalizePath(projectRoot)
  const resolved = normalizePath(path.resolve(projectRoot, filePath))
  return resolved.startsWith(normalizedRoot + path.sep) || resolved === normalizedRoot
}

const scanDynamicFiles = (root: string): Array<{ agent: string; path: string }> => {
  const dynamic: Array<{ agent: string; path: string }> = []

  const agentsDir = path.join(root, '.claude', 'agents')
  if (fs.existsSync(agentsDir)) {
    try {
      for (const entry of fs.readdirSync(agentsDir)) {
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
      for (const skillName of fs.readdirSync(skillsDir)) {
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

const scanUserDynamicFiles = (): Array<{ agent: string; path: string }> => {
  const dynamic: Array<{ agent: string; path: string }> = []
  const home = getUserHome()

  const codexDir = path.join(home, '.codex')
  if (fs.existsSync(codexDir)) {
    try {
      for (const entry of fs.readdirSync(codexDir)) {
        if (entry.endsWith('.md') || entry.endsWith('.toml')) {
          dynamic.push({ agent: 'codex', path: `~/.codex/${entry}` })
        }
      }
    } catch {
      // ignore
    }
  }

  const geminiDir = path.join(home, '.gemini')
  if (fs.existsSync(geminiDir)) {
    try {
      for (const entry of fs.readdirSync(geminiDir)) {
        if (entry.endsWith('.json') || entry.endsWith('.md') || entry.endsWith('.toml')) {
          dynamic.push({ agent: 'gemini', path: `~/.gemini/${entry}` })
        }
      }
    } catch {
      // ignore
    }
  }

  return dynamic
}

type RegistryRow = { project_name: string; project_path: string }

const getRegisteredProjects = (): RegistryRow[] => {
  try {
    const db = getDb()
    return db.prepare('SELECT project_name, project_path FROM project_registry ORDER BY project_name').all() as RegistryRow[]
  } catch {
    return []
  }
}

const getProjectFiles = (projectRoot: string, projectName: string) => {
  const staticFiles = CONFIG_FILE_PATTERNS
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

    const content = fs.readFileSync(fullPath, 'utf-8')
    const scope = filePath.startsWith('~/') ? 'user' : 'project'
    return NextResponse.json({ path: filePath, content, scope })
  } catch (error) {
    return serverError('/api/config GET', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: filePath, content, projectRoot } = body as {
      path: string
      content: string
      projectRoot?: string
    }

    if (!filePath || typeof content !== 'string') {
      return errorResponse('path and content are required')
    }

    if (!isPathSafe(filePath, projectRoot)) {
      return errorResponse('Invalid file path')
    }

    const fullPath = filePath.startsWith('~/')
      ? resolveUserPath(filePath)
      : projectRoot
        ? path.join(projectRoot, filePath)
        : null

    if (!fullPath) {
      return errorResponse('Invalid file path')
    }

    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(fullPath, content, 'utf-8')
    return NextResponse.json({ success: true, path: filePath })
  } catch (error) {
    return serverError('/api/config POST', error)
  }
}

export const dynamic = 'force-dynamic'
