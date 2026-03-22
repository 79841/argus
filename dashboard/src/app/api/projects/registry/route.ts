import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDb } from '@/shared/lib/db'

type RegistryRow = {
  project_name: string
  project_path: string
  created_at: string
}

export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM project_registry ORDER BY project_name').all() as RegistryRow[]
    return NextResponse.json({ projects: rows })
  } catch (error) {
    console.error('[/api/projects/registry GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, path: projectPath } = body as { name: string; path: string }

    if (!name || !projectPath) {
      return NextResponse.json({ error: 'name and path are required' }, { status: 400 })
    }

    const resolved = path.resolve(projectPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 400 })
    }

    const db = getDb()
    db.prepare(
      'INSERT OR REPLACE INTO project_registry (project_name, project_path) VALUES (?, ?)'
    ).run(name, resolved)

    return NextResponse.json({ success: true, name, path: resolved })
  } catch (error) {
    console.error('[/api/projects/registry POST] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name')
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const db = getDb()
    db.prepare('DELETE FROM project_registry WHERE project_name = ?').run(name)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/projects/registry DELETE] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
