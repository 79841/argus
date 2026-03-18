import { NextRequest, NextResponse } from 'next/server'
import { getSessionNarratives, getRepetitionClusters, getSessionEvolution, getCodeAreaHeatmap } from '@/lib/queries/prompt-visualization'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'narratives'
    const agentType = searchParams.get('agent_type') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const sessionId = searchParams.get('session_id') || undefined
    const project = searchParams.get('project') || undefined

    const filters = { agentType, from, to }

    switch (type) {
      case 'narratives':
        return NextResponse.json(getSessionNarratives(filters))
      case 'repetitions':
        return NextResponse.json(getRepetitionClusters(filters))
      case 'evolution': {
        if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
        return NextResponse.json(getSessionEvolution(sessionId))
      }
      case 'heatmap':
        return NextResponse.json(getCodeAreaHeatmap({ ...filters, project }))
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
