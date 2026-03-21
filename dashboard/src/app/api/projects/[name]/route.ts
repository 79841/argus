import { NextRequest, NextResponse } from 'next/server'
import { getProjectDetailStats, getProjectDailyCosts } from '@/shared/lib/queries'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const projectName = decodeURIComponent(name)

    const [stats, daily] = await Promise.all([
      getProjectDetailStats(projectName),
      getProjectDailyCosts(30),
    ])

    const projectDaily = daily.filter((d) => d.project_name === projectName)

    return NextResponse.json({ stats, daily: projectDaily })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
