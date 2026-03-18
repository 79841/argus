import { NextRequest, NextResponse } from 'next/server'
import { getSecurityStats } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined

    const stats = getSecurityStats(from, to)
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
