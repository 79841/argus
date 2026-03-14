import { NextResponse } from 'next/server'
import { getAgentDailyCosts } from '@/lib/queries'

export async function GET() {
  const costs = await getAgentDailyCosts()
  return NextResponse.json({ costs })
}
