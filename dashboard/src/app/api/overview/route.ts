import { NextRequest, NextResponse } from 'next/server'
import { getOverviewStats } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const agentType = request.nextUrl.searchParams.get('agent_type') || 'all'
    const project = request.nextUrl.searchParams.get('project') || 'all'
    const data = await getOverviewStats(agentType, project)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
