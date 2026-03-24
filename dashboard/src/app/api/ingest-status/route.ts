import { NextResponse } from 'next/server'
import { getIngestStatus } from '@/shared/lib/queries'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const agents = await getIngestStatus()
    return NextResponse.json({ agents })
  } catch (error) {
    return serverError('/api/ingest-status', error)
  }
}
