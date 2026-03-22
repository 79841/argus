import { NextRequest, NextResponse } from 'next/server'
import { getConfigHistory } from '@/shared/lib/config-tracker'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10)
    const repoPath = path.resolve(process.cwd(), '..')
    const data = await getConfigHistory(repoPath, days)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/config-history] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
