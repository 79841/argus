import { NextRequest, NextResponse } from 'next/server'
import { getDailyMetrics } from '@/shared/lib/queries'
import { errorResponse, serverError, parseAgentType, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const from = parseDateParam(params.get('from'))
    const to = parseDateParam(params.get('to'))

    if (!from || !to) {
      return errorResponse('from and to parameters are required (format: YYYY-MM-DD)')
    }

    const agentType = parseAgentType(params.get('agent_type'))
    const project = parseProject(params.get('project'))

    const data = getDailyMetrics(from, to, agentType, project)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/config-history/daily-metrics', error)
  }
}

export const dynamic = 'force-dynamic'
