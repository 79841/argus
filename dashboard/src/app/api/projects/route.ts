import { NextRequest, NextResponse } from 'next/server'
import { getProjects, getProjectCosts, getProjectComparison } from '@/shared/lib/queries'
import { parseAgentType, serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

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
      const data = await getProjectCosts(parseAgentType(agentType), from, to)
      return NextResponse.json(data)
    }

    const data = await getProjects()
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/projects', error)
  }
}
