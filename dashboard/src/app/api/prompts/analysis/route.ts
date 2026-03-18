import { NextRequest, NextResponse } from 'next/server'
import { getComplexityCostCorrelation, getCategoryDistribution, getFailedSessions, getEffectivenessPatterns } from '@/lib/queries/prompt-analysis'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'complexity'
    const agentType = searchParams.get('agent_type') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const filters = { agentType, from, to }

    switch (type) {
      case 'complexity':
        return NextResponse.json(getComplexityCostCorrelation(filters))
      case 'category':
        return NextResponse.json(getCategoryDistribution(filters))
      case 'failure':
        return NextResponse.json(getFailedSessions(filters))
      case 'effectiveness':
        return NextResponse.json(getEffectivenessPatterns(filters))
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
