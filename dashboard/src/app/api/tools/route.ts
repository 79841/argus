import { NextRequest, NextResponse } from 'next/server'
import { getToolUsageStats, getToolDetailStats, getDailyToolStats, getIndividualToolStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentType = searchParams.get('agent_type') || 'all'
    const rawDays = parseInt(searchParams.get('days') || '7', 10)
    const days = isNaN(rawDays) || rawDays < 1 ? 7 : rawDays
    const project = searchParams.get('project') || 'all'
    const detail = searchParams.get('detail') === 'true'

    if (detail) {
      const [tools, daily, individual] = await Promise.all([
        getToolDetailStats(agentType, days, project),
        getDailyToolStats(agentType, days, project),
        getIndividualToolStats(days, project),
      ])
      return NextResponse.json({ tools, daily, individual })
    }

    const tools = await getToolUsageStats(agentType, days, project)
    return NextResponse.json({ tools })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
