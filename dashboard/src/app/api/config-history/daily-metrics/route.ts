import { NextRequest, NextResponse } from 'next/server'
import { getDailyMetrics } from '@/shared/lib/queries'
import { errorResponse, serverError } from '@/shared/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const from = params.get('from')
    const to = params.get('to')

    if (!from || !to) {
      return errorResponse('from and to parameters are required')
    }

    const agentType = params.get('agent_type') || 'all'
    const project = params.get('project') || 'all'

    const data = getDailyMetrics(from, to, agentType, project)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/config-history/daily-metrics', error)
  }
}

export const dynamic = 'force-dynamic'
