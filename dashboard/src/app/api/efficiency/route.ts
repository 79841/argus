import { NextRequest, NextResponse } from 'next/server'
import { getEfficiencyStats, getEfficiencyComparison } from '@/shared/lib/queries'
import { parseDays } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const days = parseDays(sp.get('days'), 7)
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const data = await getEfficiencyStats(days, project, from, to)
    const comparison = await getEfficiencyComparison(days, project, from, to)
    return NextResponse.json({ data, comparison })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
