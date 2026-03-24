import { NextRequest, NextResponse } from 'next/server'
import { disconnectAgents } from '@/shared/lib/setup'
import type { AgentSetupType } from '@/shared/lib/setup'
import { errorResponse } from '@/shared/lib/api-utils'

export async function POST(request: NextRequest) {
  const body = await request.json() as { agents: string[] }
  const { agents } = body

  if (!Array.isArray(agents) || agents.length === 0) {
    return errorResponse('agents array is required')
  }

  const validAgents = agents.filter((a) => ['claude', 'codex', 'gemini'].includes(a)) as AgentSetupType[]
  const results = disconnectAgents(validAgents)
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
