import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

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

const discoverProjects = (): Array<{ projectRoot: string; projectName: string }> => {
  const home = getUserHome()
  const scanRoots = [
    path.join(home, 'Desktop', 'code'),
    path.join(home, 'Documents', 'code'),
    path.join(home, 'projects'),
    path.join(home, 'dev'),
    path.join(home, 'workspace'),
  ]

  const projects = new Map<string, string>()

  const scanDir = (dir: string, depth: number) => {
    if (depth > 4 || !fs.existsSync(dir)) return
    try {
      const stat = fs.statSync(dir)
      if (!stat.isDirectory()) return
    } catch {
      return
    }

    const hasConfig = CONFIG_FILE_PATTERNS.some(({ file }) =>
      fs.existsSync(path.join(dir, file))
    )
    const hasClaudeDir = fs.existsSync(path.join(dir, '.claude'))

    if (hasConfig || hasClaudeDir) {
      const name = path.basename(dir)
      projects.set(dir, name)
    }

    if (depth < 4) {
      try {
        for (const entry of fs.readdirSync(dir)) {
          if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build') continue
          scanDir(path.join(dir, entry), depth + 1)
        }
      } catch {
        // ignore permission errors
      }
    }
  }

  for (const root of scanRoots) {
    scanDir(root, 0)
  }

  return Array.from(projects.entries())
    .map(([projectRoot, projectName]) => ({ projectRoot, projectName }))
    .sort((a, b) => a.projectName.localeCompare(b.projectName))
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
      const projects = discoverProjects()
      const allProjectFiles = projects.flatMap(({ projectRoot: root, projectName }) =>
        getProjectFiles(root, projectName)
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
