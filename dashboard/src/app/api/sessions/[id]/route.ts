import { NextRequest, NextResponse } from 'next/server'
import { getSessionDetail, getSessionSummary } from '@/shared/lib/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const summary = request.nextUrl.searchParams.get('summary') === 'true'

    if (summary) {
      const [sessionSummary, events] = await Promise.all([
        getSessionSummary(id),
        getSessionDetail(id),
      ])
      return NextResponse.json({ summary: sessionSummary, events })
    }

    const events = await getSessionDetail(id)
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
