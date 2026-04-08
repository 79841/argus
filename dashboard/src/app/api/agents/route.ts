import { NextResponse } from 'next/server'
import { getActiveAgentSessions, getRunningAgentCounts, groupAgentsByProject } from '@/shared/lib/queries'
import type { AgentProject } from '@/shared/lib/queries'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export type AgentsApiResponse = {
  projects: AgentProject[]
}

export async function GET() {
  try {
    const sessions = getActiveAgentSessions()
    const sessionIds = sessions.map((s) => s.session_id)
    const runningCounts = getRunningAgentCounts(sessionIds)
    const projects = groupAgentsByProject(sessions, runningCounts)

    return NextResponse.json({ projects } satisfies AgentsApiResponse)
  } catch (error) {
    return serverError('/api/agents', error)
  }
}
