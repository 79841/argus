import { NextResponse } from 'next/server'
import { scanRegisteredTools } from '@/shared/lib/registered-tools'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tools = scanRegisteredTools()
    return NextResponse.json({ tools })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
