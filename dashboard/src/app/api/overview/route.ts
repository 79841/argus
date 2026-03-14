import { NextRequest, NextResponse } from 'next/server'
import { getOverviewStats, getAllTimeStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = sp.get('agent_type') || 'all'
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const [data, allTime] = await Promise.all([
      getOverviewStats(agentType, project, from, to),
      getAllTimeStats(agentType, project),
    ])
    return NextResponse.json({
      ...data,
      all_time_cost: allTime.total_cost,
      all_time_tokens: allTime.total_tokens,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
