import { NextRequest, NextResponse } from 'next/server'
import { connectAgents } from '@/shared/lib/setup'
import type { AgentSetupType } from '@/shared/lib/setup'
import { errorResponse } from '@/shared/lib/api-utils'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON')
  }
  const agents = body['agents']
  const endpoint = typeof body['endpoint'] === 'string' ? body['endpoint'] : undefined

  if (!Array.isArray(agents) || agents.length === 0) {
    return errorResponse('agents array is required')
  }

  const validAgents = agents.filter((a): a is AgentSetupType => ['claude', 'codex', 'gemini'].includes(a as string))
  const results = connectAgents(validAgents, endpoint ?? 'http://localhost:9845')
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
