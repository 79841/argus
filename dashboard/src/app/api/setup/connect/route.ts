import { NextRequest, NextResponse } from 'next/server'
import { connectAgents } from '@/shared/lib/setup'
import type { AgentSetupType } from '@/shared/lib/setup'
import { errorResponse } from '@/shared/lib/api-utils'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON')
  }
  const agents = body['agents']
  const endpointRaw = typeof body['endpoint'] === 'string' ? body['endpoint'] : undefined

  if (!Array.isArray(agents) || agents.length === 0) {
    return errorResponse('agents array is required')
  }

  let endpoint = endpointRaw ?? 'http://localhost:9845'
  if (endpointRaw !== undefined) {
    try {
      const parsed = new URL(endpointRaw)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return errorResponse('endpoint must use http or https')
      }
      if (endpointRaw.length > 500) {
        return errorResponse('endpoint is too long')
      }
    } catch {
      return errorResponse('endpoint must be a valid URL')
    }
    endpoint = endpointRaw
  }

  const validAgents = agents.filter((a): a is AgentSetupType => ['claude', 'codex', 'gemini'].includes(a as string))
  const results = connectAgents(validAgents, endpoint)
  return NextResponse.json({ results })
}

export const dynamic = 'force-dynamic'
