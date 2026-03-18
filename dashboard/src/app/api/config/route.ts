import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '@/lib/db'

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

const isPathSafe = (filePath: string, projectRoot?: string): boolean => {
  if (filePath.startsWith('~/')) {
    const resolved = path.resolve(resolveUserPath(filePath))
    const home = getUserHome()
    return resolved.startsWith(home + path.sep) || resolved === home
  }
  if (!projectRoot) return false
  const resolved = path.resolve(projectRoot, filePath)
  return resolved.startsWith(projectRoot + path.sep) || resolved === projectRoot
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

/** Decode ~/.claude/projects/ directory name back to filesystem path */
const decodeCloudeProjectDir = (encoded: string): string | null => {
  const parts = encoded.slice(1).split('-')

  const tryPath = (idx: number, current: string): string | null => {
    if (idx >= parts.length) {
      try { return fs.statSync(current).isDirectory() ? current : null } catch { return null }
    }
    // Try as hyphenated segment first (more specific)
    const withHyphen = tryPath(idx + 1, current + '-' + parts[idx])
    if (withHyphen) return withHyphen
    // Try as new path segment
    const withSlash = tryPath(idx + 1, current + '/' + parts[idx])
    if (withSlash) return withSlash
    return null
  }

  return tryPath(1, '/' + parts[0])
}

/** Get registered project names from DB */
const getRegisteredProjects = (): string[] => {
  try {
    const db = getDb()
    const rows = db.prepare(
      "SELECT DISTINCT project_name FROM agent_logs WHERE project_name != '' ORDER BY project_name"
    ).all() as Array<{ project_name: string }>
    return rows.map((r) => r.project_name)
  } catch {
    return []
  }
}

/** Build map: projectName → filesystem path using ~/.claude/projects/ */
const buildProjectPathMap = (): Map<string, string> => {
  const result = new Map<string, string>()
  const projectNames = getRegisteredProjects()
  if (projectNames.length === 0) return result

  const claudeProjectsDir = path.join(getUserHome(), '.claude', 'projects')
  if (!fs.existsSync(claudeProjectsDir)) return result

  let dirs: string[]
  try {
    dirs = fs.readdirSync(claudeProjectsDir).filter((d) => d.startsWith('-'))
  } catch {
    return result
  }

  for (const projectName of projectNames) {
    const encoded = projectName.replace(/\//g, '-')
    const matching = dirs.filter((d) => d.endsWith('-' + encoded))

    for (const match of matching) {
      const decoded = decodeCloudeProjectDir(match)
      if (decoded) {
        result.set(projectName, decoded)
        break
      }
    }
  }

  return result
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
      const projectPathMap = buildProjectPathMap()

      const allProjectFiles = Array.from(projectPathMap.entries()).flatMap(
        ([name, root]) => getProjectFiles(root, name)
      )

      const userFiles = USER_STATIC_FILES
        .filter((f) => fs.existsSync(resolveUserPath(f.path)))
        .map((f) => ({
          path: f.path,
          agent: f.agent,
          scope: 'user' as const,
          exists: true,
          projectRoot: '',
          projectName: '',
        }))

      return NextResponse.json({ files: [...allProjectFiles, ...userFiles] })
    }

    if (!isPathSafe(filePath, projectRoot ?? undefined)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'path and content are required' }, { status: 400 })
    }

    if (!isPathSafe(filePath, projectRoot)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const fullPath = filePath.startsWith('~/')
      ? resolveUserPath(filePath)
      : projectRoot
        ? path.join(projectRoot, filePath)
        : null

    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(fullPath, content, 'utf-8')
    return NextResponse.json({ success: true, path: filePath })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
