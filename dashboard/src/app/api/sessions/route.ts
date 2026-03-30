import { NextRequest, NextResponse } from 'next/server'
import { getSessions } from '@/shared/lib/queries'
import { parseAgentType, parseLimit, serverError, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const project = parseProject(sp.get('project'))
    const from = parseDateParam(sp.get('from'))
    const to = parseDateParam(sp.get('to'))
    const limit = parseLimit(sp.get('limit'), 100)
    const data = await getSessions(agentType, project, from, to, limit)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/sessions', error)
  }
}
