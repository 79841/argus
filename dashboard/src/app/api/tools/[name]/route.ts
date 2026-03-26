import { NextRequest, NextResponse } from 'next/server'
import { getToolSingleStat, getToolDailyStats, getToolRelatedSessions } from '@/shared/lib/queries'
import { parseDays, serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const toolName = decodeURIComponent(name)
    const sp = request.nextUrl.searchParams
    const days = parseDays(sp.get('days'), 7)

    const [tool, daily, sessions] = await Promise.all([
      getToolSingleStat(toolName, days),
      getToolDailyStats(toolName, days),
      getToolRelatedSessions(toolName, days, 20),
    ])

    return NextResponse.json({ tool, daily, sessions })
  } catch (error) {
    return serverError('/api/tools/[name]', error)
  }
}
