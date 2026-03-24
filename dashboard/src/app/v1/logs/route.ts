/**
 * OTLP HTTP standard endpoint: POST /v1/logs
 * Accepts both JSON and Protobuf formats.
 * Converts protobuf to JSON, then proxies to /api/ingest.
 */
import { NextRequest, NextResponse } from 'next/server'
import { POST as ingestPOST } from '@/app/api/ingest/route'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require('@opentelemetry/otlp-transformer/build/src/generated/root')
const ExportLogsServiceRequest = root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest

export async function POST(request: NextRequest) {
  const ct = request.headers.get('content-type') || ''
  const buf = await request.arrayBuffer()

  // Try JSON first if content-type indicates JSON
  if (ct.includes('json')) {
    try {
      const text = new TextDecoder().decode(buf)
      const jsonRequest = new NextRequest(request.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
      })
      return ingestPOST(jsonRequest)
    } catch {
      // intentional: fall through to protobuf decode
    }
  }

  // Try protobuf decode
  try {
    const decoded = ExportLogsServiceRequest.decode(new Uint8Array(buf))
    const json = ExportLogsServiceRequest.toObject(decoded, {
      longs: String,
      enums: String,
      defaults: true,
    })

    const jsonRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(json),
    })
    return ingestPOST(jsonRequest)
  } catch (protoErr) {
    // Try as JSON fallback
    try {
      const text = new TextDecoder().decode(buf)
      const jsonRequest = new NextRequest(request.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
      })
      return ingestPOST(jsonRequest)
    } catch (jsonFallbackErr) {
      console.error('[/v1/logs] Failed to parse request (protobuf and JSON both failed):', protoErr, jsonFallbackErr)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
