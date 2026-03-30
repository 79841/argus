import { NextRequest, NextResponse } from 'next/server'
import { getOverviewStats, getAllTimeStats, getOverviewDelta, getAgentTodaySummaries, getAgentDistribution } from '@/shared/lib/queries'
import { parseAgentType, serverError, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const project = parseProject(sp.get('project'))
    const from = parseDateParam(sp.get('from'))
    const to = parseDateParam(sp.get('to'))
    const today = new Date().toISOString().split('T')[0]
    const [data, allTime, delta, agentSummaries, agentDistribution] = await Promise.all([
      getOverviewStats(agentType, project, from, to, today),
      getAllTimeStats(agentType, project),
      getOverviewDelta(agentType, project, today),
      getAgentTodaySummaries(today),
      getAgentDistribution(from, to, today),
    ])
    return NextResponse.json({
      ...data,
      all_time_cost: allTime.total_cost,
      all_time_tokens: allTime.total_tokens,
      delta,
      agent_summaries: agentSummaries,
      agent_distribution: agentDistribution,
    })
  } catch (error) {
    return serverError('/api/overview', error)
  }
}
