/**
 * OTLP HTTP/JSON standard endpoint: POST /v1/traces
 * Accept and discard (Argus only processes logs).
 */
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ partialSuccess: {} })
}
