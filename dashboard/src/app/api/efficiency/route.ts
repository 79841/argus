import { NextRequest, NextResponse } from 'next/server'
import { getEfficiencyStats, getEfficiencyComparison } from '@/shared/lib/queries'
import { parseDays, parseAgentType, serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const days = parseDays(sp.get('days'), 7)
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const data = await getEfficiencyStats(agentType, days, project, from, to)
    const comparison = await getEfficiencyComparison(agentType, days, project, from, to)
    return NextResponse.json({ data, comparison })
  } catch (error) {
    return serverError('/api/efficiency', error)
  }
}
