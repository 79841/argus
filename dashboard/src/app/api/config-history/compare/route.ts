import { NextRequest, NextResponse } from 'next/server'
import { getImpactCompare, getImpactCompareBatch } from '@/shared/lib/queries'
import { errorResponse, serverError } from '@/shared/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const date = params.get('date')
    const dates = params.get('dates')
    const days = parseInt(params.get('days') || '7', 10)

    const agentType = params.get('agent_type') || 'all'
    const project = params.get('project') || 'all'

    if (dates) {
      const dateList = dates.split(',').filter(Boolean).slice(0, 30)
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
