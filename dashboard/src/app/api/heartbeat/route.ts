import { NextRequest, NextResponse } from 'next/server'
import { getHeartbeatData } from '@/shared/lib/queries'
import { parseAgentType, serverError } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

const MAX_MINUTES = 60
const DEFAULT_MINUTES = 5

const parseMinutes = (value: string | null): number => {
  const n = parseInt(value ?? '', 10)
  return isNaN(n) || n < 1 || n > MAX_MINUTES ? DEFAULT_MINUTES : n
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const agentType = parseAgentType(sp.get('agent_type'))
    const minutes = parseMinutes(sp.get('minutes'))

    const data = getHeartbeatData(agentType, minutes)
    return NextResponse.json({ data, minutes, agent_type: agentType })
  } catch (error) {
    return serverError('/api/heartbeat', error)
  }
}
