import { NextRequest, NextResponse } from 'next/server'
import { getSuggestionMetrics } from '@/shared/lib/queries'
import { generateSuggestions } from '@/shared/lib/suggestions'
import { parseDays } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const days = parseDays(sp.get('days'), 7)

    const metrics = await getSuggestionMetrics(days)
    const suggestions = generateSuggestions(metrics)

    return NextResponse.json({ suggestions, metrics })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
