import { NextRequest, NextResponse } from 'next/server'
import { getDailyStats } from '@/shared/lib/queries'
import { parseAgentType, parseDays, serverError, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const days = parseDays(sp.get('days'), 30)
    const project = parseProject(sp.get('project'))
    const from = parseDateParam(sp.get('from'))
    const to = parseDateParam(sp.get('to'))
    const data = await getDailyStats(agentType, days, project, from, to)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/daily', error)
  }
}
