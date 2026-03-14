import { NextRequest, NextResponse } from 'next/server'
import { getDailyStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = sp.get('agent_type') || 'all'
    const days = parseInt(sp.get('days') || '30', 10)
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const data = await getDailyStats(agentType, days, project, from, to)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
