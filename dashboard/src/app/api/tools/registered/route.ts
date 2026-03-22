import { NextResponse } from 'next/server'
import { scanRegisteredTools } from '@/shared/lib/registered-tools'
import { serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tools = scanRegisteredTools()
    return NextResponse.json({ tools })
  } catch (error) {
    return serverError('/api/tools/registered', error)
  }
}
