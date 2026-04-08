import { NextResponse } from 'next/server'
import { getActiveAgentSessions, getRunningAgentCounts, groupAgentsByProject } from '@/shared/lib/queries'
import type { AgentProject } from '@/shared/lib/queries'
import { hooksState, mergeHookAndOtelProjects } from '@/shared/lib/hooks-state'
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
    const otelProjects = groupAgentsByProject(sessions, runningCounts)

    if (hooksState.hasActiveSessions()) {
      const hookProjects = hooksState.getProjects()
      const projects = mergeHookAndOtelProjects(hookProjects, otelProjects)
      return NextResponse.json({ projects } satisfies AgentsApiResponse)
    }

    return NextResponse.json({ projects: otelProjects } satisfies AgentsApiResponse)
  } catch (error) {
    return serverError('/api/agents', error)
  }
}
