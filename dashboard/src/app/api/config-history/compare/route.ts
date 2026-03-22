import { NextRequest, NextResponse } from 'next/server'
import { getImpactCompare, getImpactCompareBatch } from '@/shared/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const date = params.get('date')
    const dates = params.get('dates')
    const days = parseInt(params.get('days') || '7', 10)

    const agentType = params.get('agent_type') || 'all'
    const project = params.get('project') || 'all'

    if (dates) {
      const dateList = dates.split(',').filter(Boolean)
      const data = getImpactCompareBatch(dateList, days, agentType, project)
      return NextResponse.json(data)
    }

    if (!date) {
      return NextResponse.json({ error: 'date or dates parameter is required' }, { status: 400 })
    }

    const data = getImpactCompare(date, days, agentType, project)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/config-history/compare] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
