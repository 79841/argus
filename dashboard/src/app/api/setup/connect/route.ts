import { NextRequest, NextResponse } from 'next/server'
import { connectAgents } from '@/shared/lib/setup'
import type { AgentSetupType } from '@/shared/lib/setup'
import { errorResponse } from '@/shared/lib/api-utils'

export async function POST(request: NextRequest) {
  const body = await request.json() as { agents: string[]; endpoint?: string }
  const { agents, endpoint } = body

  if (!Array.isArray(agents) || agents.length === 0) {
    return errorResponse('agents array is required')
  }

  const validAgents = agents.filter((a) => ['claude', 'codex', 'gemini'].includes(a)) as AgentSetupType[]
  const results = connectAgents(validAgents, endpoint ?? 'http://localhost:9845')
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
