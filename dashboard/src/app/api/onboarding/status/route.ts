import { NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT EXISTS(SELECT 1 FROM agent_logs LIMIT 1) as has_data').get() as { has_data: number }
    return NextResponse.json({
      hasData: row.has_data === 1,
    })
  } catch (error) {
    return serverError('/api/onboarding/status', error)
  }
}
