import { NextRequest, NextResponse } from 'next/server'
import { searchPrompts } from '@/lib/queries'
import { parseAgentType, parseLimit } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const query = sp.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const agentType = parseAgentType(sp.get('agent_type'))
    const sessionId = sp.get('session_id') || undefined
    const project = sp.get('project') || undefined
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const limit = parseLimit(sp.get('limit'), 20)
    const offset = Math.max(0, parseInt(sp.get('offset') ?? '0', 10) || 0)

    const results = searchPrompts(query.trim(), {
      sessionId,
      agentType,
      project,
      from,
      to,
      limit,
      offset,
    })

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
