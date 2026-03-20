import { NextRequest, NextResponse } from 'next/server'
import { disconnectAgents } from '@/lib/setup'
import type { AgentSetupType } from '@/lib/setup'

export async function POST(request: NextRequest) {
  const body = await request.json() as { agents: string[] }
  const { agents } = body

  if (!Array.isArray(agents) || agents.length === 0) {
    return NextResponse.json({ error: 'agents array is required' }, { status: 400 })
  }

  const validAgents = agents.filter((a) => ['claude', 'codex', 'gemini'].includes(a)) as AgentSetupType[]
  const results = disconnectAgents(validAgents)
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
