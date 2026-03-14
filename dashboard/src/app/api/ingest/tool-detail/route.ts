import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type ToolDetailPayload = {
  session_id?: string
  tool_name?: string
  detail_name?: string
  detail_type?: string
  duration_ms?: number
  success?: boolean
  project_name?: string
  agent_type?: string
  metadata?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as ToolDetailPayload
    const db = getDb()

    db.prepare(`
      INSERT INTO tool_details (
        session_id, tool_name, detail_name, detail_type,
        duration_ms, success, project_name, metadata, agent_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.session_id ?? '',
      data.tool_name ?? '',
      data.detail_name ?? '',
      data.detail_type ?? '',
      data.duration_ms ?? 0,
      data.success === undefined ? null : data.success ? 1 : 0,
      data.project_name ?? '',
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      data.agent_type ?? 'claude'
    )

    return NextResponse.json({ accepted: 1 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
