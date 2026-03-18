import { NextRequest, NextResponse } from 'next/server'
import { getHighCostSessions, getModelCostEfficiency, getBudgetStatus } from '@/lib/queries'
import { parseDays, parseLimit } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const days = parseDays(sp.get('days'), 7)
    const limit = parseLimit(sp.get('limit'), 10)

    const [highCostSessions, modelEfficiency, budgetStatus] = await Promise.all([
      getHighCostSessions(days, limit),
      getModelCostEfficiency(days),
      getBudgetStatus(),
    ])

    return NextResponse.json({ highCostSessions, modelEfficiency, budgetStatus })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
