import { NextRequest, NextResponse } from 'next/server'
import { disconnectAgents } from '@/shared/lib/setup'
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

  if (!Array.isArray(agents) || agents.length === 0) {
    return errorResponse('agents array is required')
  }

  const validAgents = agents.filter((a): a is AgentSetupType => ['claude', 'codex', 'gemini'].includes(a as string))
  const results = disconnectAgents(validAgents)
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
