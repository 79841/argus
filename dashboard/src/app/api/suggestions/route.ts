import { NextRequest, NextResponse } from 'next/server'
import { getSuggestionMetrics } from '@/lib/queries'
import { generateSuggestions } from '@/lib/suggestions'
import { parseDays } from '@/lib/api-utils'

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
