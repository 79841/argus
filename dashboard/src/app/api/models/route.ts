import { NextRequest, NextResponse } from 'next/server'
import { getModelUsage } from '@/lib/queries'
import { parseAgentType } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const project = sp.get('project') || 'all'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const data = await getModelUsage(agentType, project, from, to)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
