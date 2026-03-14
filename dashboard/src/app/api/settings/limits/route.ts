import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export type AgentLimit = {
  agent_type: string
  daily_cost_limit: number
  monthly_cost_limit: number
}

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT agent_type, daily_cost_limit, monthly_cost_limit FROM agent_limits').all() as AgentLimit[]
  return NextResponse.json({ limits: rows })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { limits: AgentLimit[] }
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
      upsert.run(limit.agent_type, limit.daily_cost_limit, limit.monthly_cost_limit)
    }
  })
  tx()

  return NextResponse.json({ ok: true })
}
