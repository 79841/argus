import { NextRequest, NextResponse } from 'next/server'
import { getConfigHistory } from '@/shared/lib/config-tracker'
import path from 'path'
import { serverError, parseDays } from '@/shared/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const days = parseDays(request.nextUrl.searchParams.get('days'), 30)
    const repoPath = path.resolve(process.cwd(), '..')
    const data = await getConfigHistory(repoPath, days)
    return NextResponse.json(data)
  } catch (error) {
    return serverError('/api/config-history', error)
  }
}

export const dynamic = 'force-dynamic'
