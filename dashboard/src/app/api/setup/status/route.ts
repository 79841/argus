import { NextResponse } from 'next/server'
import { getSetupStatus } from '@/shared/lib/setup'

export async function GET() {
  const agents = getSetupStatus()
  return NextResponse.json({ agents })
}

export const dynamic = 'force-dynamic'
