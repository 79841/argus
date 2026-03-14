import { NextResponse } from 'next/server'
import { getProjects } from '@/lib/queries'

export async function GET() {
  try {
    const data = await getProjects()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
