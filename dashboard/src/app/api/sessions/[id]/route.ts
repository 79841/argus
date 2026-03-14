import { NextRequest, NextResponse } from 'next/server'
import { getSessionDetail } from '@/lib/queries'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }
    const events = await getSessionDetail(id)
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
