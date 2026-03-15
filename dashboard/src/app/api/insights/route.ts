import { NextRequest, NextResponse } from 'next/server'
import { getHighCostSessions, getModelCostEfficiency, getBudgetStatus } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const days = parseInt(sp.get('days') || '7', 10)
    const limit = parseInt(sp.get('limit') || '10', 10)

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
