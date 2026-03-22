import { NextRequest, NextResponse } from 'next/server'
import { getOverviewStats, getAllTimeStats, getOverviewDelta, getAgentTodaySummaries, getAgentDistribution } from '@/shared/lib/queries'
import { parseAgentType } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const [data, allTime, delta, agentSummaries, agentDistribution] = await Promise.all([
      getOverviewStats(agentType, project, from, to),
      getAllTimeStats(agentType, project),
      getOverviewDelta(agentType, project),
      getAgentTodaySummaries(),
      getAgentDistribution(from, to),
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
    console.error('[/api/overview] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
