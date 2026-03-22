import { NextResponse } from 'next/server'
import { getAgentDailyCosts } from '@/shared/lib/queries'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const costs = await getAgentDailyCosts()
    return NextResponse.json({ costs })
  } catch (error) {
    return serverError('/api/daily-costs', error)
  }
}
