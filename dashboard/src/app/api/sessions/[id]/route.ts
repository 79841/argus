import { NextRequest, NextResponse } from 'next/server'
import { getSessionDetail, getSessionSummary } from '@/shared/lib/queries'
import { errorResponse, serverError, parseSlug } from '@/shared/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = parseSlug(rawId ?? '')
    if (!id) {
      return errorResponse('Session ID required')
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
  } catch (error) {
    return serverError('/api/sessions/[id]', error)
  }
}
