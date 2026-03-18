import { NextRequest, NextResponse } from 'next/server'
import { getDailyStats } from '@/lib/queries'
import { parseAgentType, parseDays } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const days = parseDays(sp.get('days'), 30)
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const data = await getDailyStats(agentType, days, project, from, to)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
