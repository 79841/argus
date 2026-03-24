import { NextResponse } from 'next/server'
import { getActiveSessions } from '@/shared/lib/queries'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessions = await getActiveSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    return serverError('/api/sessions/active', error)
  }
}
