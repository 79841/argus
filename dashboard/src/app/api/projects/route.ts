import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getProjectCosts, getProjectComparison } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = sp.get('agent_type')
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined
    const view = sp.get('view')

    if (view === 'comparison') {
      const data = await getProjectComparison()
      return NextResponse.json(data)
    }

    if (agentType !== null || from || to) {
      const data = await getProjectCosts(agentType ?? 'all', from, to)
      return NextResponse.json(data)
    }

    const data = await getProjects()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
