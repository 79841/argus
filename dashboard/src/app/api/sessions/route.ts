import { NextRequest, NextResponse } from 'next/server'
import { getSessions } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const agentType = request.nextUrl.searchParams.get('agent_type') || 'all'
    const project = request.nextUrl.searchParams.get('project') || 'all'
    const data = await getSessions(agentType, project)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
