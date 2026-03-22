import { NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { syncPricingFromLiteLLM } from '@/shared/lib/pricing-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare(
      `SELECT value FROM app_meta WHERE key = 'pricing_last_synced_at'`
    ).get() as { value: string } | undefined
    return NextResponse.json({ lastSyncedAt: row?.value ?? null })
  } catch (error) {
    console.error('[/api/pricing-sync] GET error:', error)
    return NextResponse.json({ lastSyncedAt: null })
  }
}

export async function POST() {
  try {
    const db = getDb()
    const count = await syncPricingFromLiteLLM(db)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('pricing_last_synced_at', ?)`
    ).run(now)
    return NextResponse.json({ synced: count, lastSyncedAt: now })
  } catch (error) {
    console.error('[/api/pricing-sync] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
