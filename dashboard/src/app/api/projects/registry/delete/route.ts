import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json() as { name: string }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const db = getDb()
    db.prepare('DELETE FROM project_registry WHERE project_name = ?').run(name)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/projects/registry/delete] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
