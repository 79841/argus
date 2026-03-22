import { NextRequest, NextResponse } from 'next/server'
import { getToolUsageStats, getToolDetailStats, getDailyToolStats, getIndividualToolStats } from '@/shared/lib/queries'
import { parseAgentType, parseDays } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const days = parseDays(sp.get('days'), 7)
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
  } catch (error) {
    console.error('[/api/tools] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
