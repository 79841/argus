import { NextResponse } from 'next/server'
import { getIngestStatus } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const agents = await getIngestStatus()
    return NextResponse.json({ agents })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
