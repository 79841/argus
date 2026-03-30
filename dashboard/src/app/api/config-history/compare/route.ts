import { NextRequest, NextResponse } from 'next/server'
import { getImpactCompare, getImpactCompareBatch } from '@/shared/lib/queries'
import { errorResponse, serverError, parseDays, parseAgentType, parseProject, parseDateParam } from '@/shared/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const date = parseDateParam(params.get('date'))
    const datesRaw = params.get('dates')
    const days = parseDays(params.get('days'), 7)

    const agentType = parseAgentType(params.get('agent_type'))
    const project = parseProject(params.get('project'))

    if (datesRaw) {
      const dateList = datesRaw.split(',').filter(Boolean).slice(0, 30)
      const data = getImpactCompareBatch(dateList, days, agentType, project)
      return NextResponse.json(data)
    }

    if (!date) {
      return errorResponse('date or dates parameter is required')
    }

    const data = getImpactCompare(date, days, agentType, project)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/config-history/compare', error)
  }
}

export const dynamic = 'force-dynamic'
