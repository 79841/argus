import { NextRequest, NextResponse } from 'next/server'
import { getImpactCompare } from '@/shared/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const date = params.get('date')
    const days = parseInt(params.get('days') || '7', 10)

    if (!date) {
      return NextResponse.json({ error: 'date parameter is required' }, { status: 400 })
    }

    const data = getImpactCompare(date, days)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/config-history/compare] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
