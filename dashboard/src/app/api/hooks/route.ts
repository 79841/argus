import { NextRequest, NextResponse } from 'next/server'
import { hooksState } from '@/shared/lib/hooks-state'
import type { HookEvent, HookEventType } from '@/shared/lib/hooks-state'

export const dynamic = 'force-dynamic'

const VALID_HOOK_TYPES = new Set<HookEventType>(['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const hookType = body.hook_type as string
  if (!hookType || !VALID_HOOK_TYPES.has(hookType as HookEventType)) {
    return NextResponse.json({ error: 'Invalid hook_type' }, { status: 400 })
  }

  const sessionId = body.session_id as string
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  hooksState.handleHookEvent(body as unknown as HookEvent)
  return NextResponse.json({ accepted: true })
}
