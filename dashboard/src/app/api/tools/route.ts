import { NextRequest, NextResponse } from 'next/server'
import { getToolUsageStats, getToolDetailStats, getDailyToolStats, getIndividualToolStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = sp.get('agent_type') || 'all'
    const rawDays = parseInt(sp.get('days') || '7', 10)
    const days = isNaN(rawDays) || rawDays < 1 ? 7 : rawDays
    const project = sp.get('project') || 'all'
    const detail = sp.get('detail') === 'true'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined

    if (detail) {
      const [tools, daily, individual] = await Promise.all([
        getToolDetailStats(agentType, days, project, from, to),
        getDailyToolStats(agentType, days, project, from, to),
        getIndividualToolStats(days, project, from, to),
      ])
      return NextResponse.json({ tools, daily, individual })
    }

    const tools = await getToolUsageStats(agentType, days, project, from, to)
    return NextResponse.json({ tools })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
