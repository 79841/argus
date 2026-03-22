import { NextRequest, NextResponse } from 'next/server'
import { getHighCostSessions, getModelCostEfficiency } from '@/shared/lib/queries'
import { parseDays, parseLimit } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const days = parseDays(sp.get('days'), 7)
    const limit = parseLimit(sp.get('limit'), 10)

    const [highCostSessions, modelEfficiency] = await Promise.all([
      getHighCostSessions(days, limit),
      getModelCostEfficiency(days),
    ])

    return NextResponse.json({ highCostSessions, modelEfficiency })
  } catch (error) {
    console.error('[/api/insights] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
