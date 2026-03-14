import { NextResponse } from 'next/server'
import { scanRegisteredTools } from '@/lib/registered-tools'

export async function GET() {
  const tools = scanRegisteredTools()
  return NextResponse.json({ tools })
}
