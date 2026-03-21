import { NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { syncPricingFromLiteLLM } from '@/shared/lib/pricing-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const db = getDb()
    const count = await syncPricingFromLiteLLM(db)
    return NextResponse.json({ synced: count })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
