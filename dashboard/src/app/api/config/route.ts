import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PROJECT_FILES = [
  'CLAUDE.md',
  'codex.md',
  'GEMINI.md',
  'AGENTS.md',
  '.claude/settings.json',
  '.mcp.json',
]

const getProjectRoot = () => path.resolve(process.cwd(), '..')

const isPathSafe = (filePath: string): boolean => {
  const resolved = path.resolve(getProjectRoot(), filePath)
  const root = getProjectRoot()
  return resolved.startsWith(root) && !filePath.includes('..')
}

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')

    if (!filePath) {
      const root = getProjectRoot()
      const files = PROJECT_FILES.map((f) => ({
        path: f,
        exists: fs.existsSync(path.join(root, f)),
      }))
      return NextResponse.json({ files })
    }

    if (!isPathSafe(filePath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const fullPath = path.join(getProjectRoot(), filePath)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found', content: '' }, { status: 404 })
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    return NextResponse.json({ path: filePath, content })
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

    const fullPath = path.join(getProjectRoot(), filePath)
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
