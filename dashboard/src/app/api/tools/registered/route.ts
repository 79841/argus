import { NextResponse } from 'next/server'
import { scanRegisteredTools } from '@/lib/registered-tools'

export async function GET() {
  try {
    const tools = scanRegisteredTools()
    return NextResponse.json({ tools })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
