import { NextRequest, NextResponse } from 'next/server'
import { getProjectDetailStats, getProjectDailyCosts } from '@/shared/lib/queries'
import { serverError, errorResponse, parseSlug } from '@/shared/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: rawName } = await params
    const projectName = parseSlug(decodeURIComponent(rawName ?? ''))
    if (!projectName) {
      return errorResponse('Project name is required')
    }

    const [stats, daily] = await Promise.all([
      getProjectDetailStats(projectName),
      getProjectDailyCosts(30, undefined, projectName),
    ])

    return NextResponse.json({ stats, daily })
  } catch (error) {
    return serverError('/api/projects/[name]', error)
  }
}
