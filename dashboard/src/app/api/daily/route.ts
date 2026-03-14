import { NextRequest, NextResponse } from 'next/server'
import { getDailyStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentType = searchParams.get('agent_type') || 'all'
    const days = parseInt(searchParams.get('days') || '30', 10)
    const project = searchParams.get('project') || 'all'
    const data = await getDailyStats(agentType, days, project)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
