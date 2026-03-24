import { NextRequest, NextResponse } from 'next/server'
import { getSessions } from '@/shared/lib/queries'
import { parseAgentType, parseLimit, serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const limit = parseLimit(sp.get('limit'), 100)
    const data = await getSessions(agentType, project, from, to, limit)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/sessions', error)
  }
}
