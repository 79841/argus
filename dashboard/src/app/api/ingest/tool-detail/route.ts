import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { errorResponse, parseAgentType } from '@/shared/lib/api-utils'

const VALID_DETAIL_TYPES = ['mcp', 'skill', 'agent', ''] as const
const MAX_STR_LEN = 300

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
  let data: ToolDetailPayload
  try {
    data = (await request.json()) as ToolDetailPayload
  } catch {
    return errorResponse('Invalid JSON')
  }

  if (!data.session_id || typeof data.session_id !== 'string' || data.session_id.trim() === '') {
    return errorResponse('session_id is required')
  }

  if (data.session_id.length > MAX_STR_LEN) {
    return errorResponse('session_id is too long')
  }

  if (!data.tool_name || typeof data.tool_name !== 'string' || data.tool_name.trim() === '') {
    return errorResponse('tool_name is required')
  }

  if (data.tool_name.length > MAX_STR_LEN) {
    return errorResponse('tool_name is too long')
  }

  if (data.detail_type !== undefined && !VALID_DETAIL_TYPES.includes(data.detail_type as typeof VALID_DETAIL_TYPES[number])) {
    return errorResponse(`detail_type must be one of: ${VALID_DETAIL_TYPES.filter(Boolean).join(', ')}`)
  }

  if (data.detail_name && typeof data.detail_name === 'string' && data.detail_name.length > MAX_STR_LEN) {
    return errorResponse('detail_name is too long')
  }

  if (data.project_name && typeof data.project_name === 'string' && data.project_name.length > MAX_STR_LEN) {
    return errorResponse('project_name is too long')
  }

  const agentType = parseAgentType(data.agent_type ?? null)

  try {
    const db = getDb()

    db.prepare(`
      INSERT INTO tool_details (
        session_id, tool_name, detail_name, detail_type,
        duration_ms, success, project_name, metadata, agent_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.session_id,
      data.tool_name,
      data.detail_name ?? '',
      data.detail_type ?? '',
      data.duration_ms ?? 0,
      data.success === undefined ? null : data.success ? 1 : 0,
      data.project_name ?? '',
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      agentType === 'all' ? 'claude' : agentType
    )

    return NextResponse.json({ accepted: 1 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message)
  }
}
