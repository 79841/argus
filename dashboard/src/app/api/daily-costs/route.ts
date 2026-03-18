import { NextResponse } from 'next/server'
import { getAgentDailyCosts } from '@/lib/queries'

export async function GET() {
  try {
    const costs = await getAgentDailyCosts()
    return NextResponse.json({ costs })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
