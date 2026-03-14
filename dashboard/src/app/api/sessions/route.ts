import { NextRequest, NextResponse } from 'next/server'
import { getSessions } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = sp.get('agent_type') || 'all'
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const limit = sp.get('limit') ? Number(sp.get('limit')) : 100
    const data = await getSessions(agentType, project, from, to, limit)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
