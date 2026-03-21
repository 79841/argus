import { NextResponse } from 'next/server'
import { getActiveSessions } from '@/shared/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessions = await getActiveSessions()
    return NextResponse.json({ sessions })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
