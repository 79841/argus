import { NextRequest, NextResponse } from 'next/server'
import { getConfigCompareStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const date = params.get('date')
    const days = parseInt(params.get('days') || '7', 10)

    if (!date) {
      return NextResponse.json({ error: 'date parameter is required' }, { status: 400 })
    }

    const data = await getConfigCompareStats(date, days)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
