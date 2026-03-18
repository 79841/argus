import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const getProjectRoot = () => path.resolve(process.cwd(), '..')
const getUserHome = () => os.homedir()

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
    return resolved.startsWith(home + path.sep) || resolved === home
  }
  const root = getProjectRoot()
  const resolved = path.resolve(root, filePath)
  return resolved.startsWith(root + path.sep) || resolved === root
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

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')

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

      return NextResponse.json({ files: [...projectFiles, ...userFiles] })
    }

    if (!isPathSafe(filePath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const fullPath = resolvePath(filePath)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found', content: '' }, { status: 404 })
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const scope = isProjectPath(filePath) ? 'project' : 'user'
    return NextResponse.json({ path: filePath, content, scope })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: filePath, content } = body as { path: string; content: string }

    if (!filePath || typeof content !== 'string') {
      return NextResponse.json({ error: 'path and content are required' }, { status: 400 })
    }

    if (!isPathSafe(filePath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const fullPath = resolvePath(filePath)
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
