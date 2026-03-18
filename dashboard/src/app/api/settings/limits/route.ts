import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { VALID_AGENT_TYPES } from '@/lib/api-utils'

export type AgentLimit = {
  agent_type: string
  daily_cost_limit: number
  monthly_cost_limit: number
}

export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT agent_type, daily_cost_limit, monthly_cost_limit FROM agent_limits').all() as AgentLimit[]
    return NextResponse.json({ limits: rows })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { limits: AgentLimit[] }

    if (!Array.isArray(body.limits)) {
      return NextResponse.json({ error: 'Invalid limits' }, { status: 400 })
    }

    const db = getDb()

    const upsert = db.prepare(`
      INSERT INTO agent_limits (agent_type, daily_cost_limit, monthly_cost_limit)
      VALUES (?, ?, ?)
      ON CONFLICT(agent_type) DO UPDATE SET
        daily_cost_limit = excluded.daily_cost_limit,
        monthly_cost_limit = excluded.monthly_cost_limit
    `)

    const tx = db.transaction(() => {
      for (const limit of body.limits) {
        if (!VALID_AGENT_TYPES.includes(limit.agent_type as typeof VALID_AGENT_TYPES[number])) continue
        upsert.run(limit.agent_type, limit.daily_cost_limit, limit.monthly_cost_limit)
      }
    })
    tx()

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
