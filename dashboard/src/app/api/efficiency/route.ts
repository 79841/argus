import { NextRequest, NextResponse } from 'next/server'
import { getEfficiencyStats, getEfficiencyComparison } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10)
    const project = request.nextUrl.searchParams.get('project') || 'all'
    const data = await getEfficiencyStats(days, project)
    const comparison = await getEfficiencyComparison(days, project)
    return NextResponse.json({ data, comparison })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
