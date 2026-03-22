import { NextRequest, NextResponse } from 'next/server'
import { getDailyMetrics } from '@/shared/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const from = params.get('from')
    const to = params.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to parameters are required' }, { status: 400 })
    }

    const data = getDailyMetrics(from, to)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/config-history/daily-metrics] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
