import { NextRequest, NextResponse } from 'next/server'
import { getEfficiencyStats, getEfficiencyComparison } from '@/shared/lib/queries'
import { parseDays, parseAgentType, serverError, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const days = parseDays(sp.get('days'), 7)
    const project = parseProject(sp.get('project'))
    const from = parseDateParam(sp.get('from'))
    const to = parseDateParam(sp.get('to'))
    const data = await getEfficiencyStats(agentType, days, project, from, to)
    const comparison = await getEfficiencyComparison(agentType, days, project, from, to)
    return NextResponse.json({ data, comparison })
  } catch (error) {
    return serverError('/api/efficiency', error)
  }
}
