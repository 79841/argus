/**
 * OTLP HTTP standard endpoint: POST /v1/metrics
 * Receives Gemini CLI metrics and stores them in SQLite.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type AnyValue = {
  stringValue?: string
  intValue?: string | number
  doubleValue?: number
  boolValue?: boolean
}

type KeyValue = {
  key: string
  value: AnyValue
}

const getVal = (kv: AnyValue | undefined): string => {
  if (!kv) return ''
  if (kv.stringValue !== undefined) return kv.stringValue
  if (kv.intValue !== undefined) return String(kv.intValue)
  if (kv.doubleValue !== undefined) return String(kv.doubleValue)
  if (kv.boolValue !== undefined) return String(kv.boolValue)
  return ''
}

const getAttr = (attrs: KeyValue[] | undefined, key: string): string => {
  const kv = attrs?.find((a) => a.key === key)
  return kv ? getVal(kv.value) : ''
}

const getNumAttr = (attrs: KeyValue[] | undefined, key: string): number => {
  const val = getAttr(attrs, key)
  return val ? Number(val) : 0
}

const attrsToJson = (attrs: KeyValue[] | undefined): string => {
  if (!attrs || attrs.length === 0) return '{}'
  return JSON.stringify(Object.fromEntries(attrs.map((a) => [a.key, getVal(a.value)])))
}

type DataPoint = {
  attributes?: Record<string, unknown> | KeyValue[]
  startTime?: string | number[]
  endTime?: string | number[]
  value?: number
  asInt?: string | number
  asDouble?: number
}

type Metric = {
  name?: string
  description?: string
  unit?: string
  sum?: { dataPoints?: DataPoint[] }
  gauge?: { dataPoints?: DataPoint[] }
  histogram?: { dataPoints?: DataPoint[] }
}

type ScopeMetrics = {
  scope?: { name?: string }
  metrics?: Metric[]
}

type ResourceMetrics = {
  resource?: { attributes?: KeyValue[] }
  scopeMetrics?: ScopeMetrics[]
}

type OtlpMetricsRequest = {
  resourceMetrics?: ResourceMetrics[]
}

const normalizeMetricAttrs = (attrs: Record<string, unknown> | KeyValue[] | undefined): KeyValue[] => {
  if (!attrs) return []
  if (Array.isArray(attrs)) {
    if (attrs.length === 0) return []
    if ('key' in attrs[0]) return attrs as KeyValue[]
  }
  return Object.entries(attrs as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: { stringValue: String(value) },
  }))
}

const calculateCost = (
  db: ReturnType<typeof getDb>,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number
): number => {
  if (!model) return 0
  const pricing = db.prepare(
    'SELECT input_per_mtok, output_per_mtok, cache_read_per_mtok FROM pricing_model WHERE model_id = ? ORDER BY effective_date DESC LIMIT 1'
  ).get(model) as { input_per_mtok: number; output_per_mtok: number; cache_read_per_mtok: number } | undefined
  if (!pricing) return 0
  return (
    (inputTokens * pricing.input_per_mtok +
      outputTokens * pricing.output_per_mtok +
      cacheReadTokens * pricing.cache_read_per_mtok) / 1_000_000
  )
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require('@opentelemetry/otlp-transformer/build/src/generated/root')
const ExportMetricsServiceRequest = root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest

export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get('content-type') || ''
    const buf = await request.arrayBuffer()
    let data: OtlpMetricsRequest

    // Try JSON first, then protobuf
    try {
      const text = new TextDecoder().decode(buf)
      data = JSON.parse(text) as OtlpMetricsRequest
    } catch {
      try {
        const decoded = ExportMetricsServiceRequest.decode(new Uint8Array(buf))
        data = ExportMetricsServiceRequest.toObject(decoded, {
          longs: String,
          enums: String,
          defaults: true,
        }) as OtlpMetricsRequest
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    const db = getDb()
    let count = 0

    const insert = db.prepare(`
      INSERT INTO agent_logs (
        timestamp, agent_type, service_name, event_name, session_id, prompt_id,
        model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        cost_usd, duration_ms, speed, tool_name, tool_success,
        severity_text, body, project_name, resource_attributes, log_attributes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction(() => {
      for (const rm of data.resourceMetrics ?? []) {
        const resAttrs = rm.resource?.attributes
        const serviceName = getAttr(resAttrs, 'service.name')

        for (const sm of rm.scopeMetrics ?? []) {
          for (const metric of sm.metrics ?? []) {
            const metricName = metric.name || ''

            // Skip non-Gemini metrics
            if (!metricName.startsWith('gemini_cli.')) continue

            const dataPoints = metric.sum?.dataPoints || metric.gauge?.dataPoints || []

            for (const dp of dataPoints) {
              const dpAttrs = normalizeMetricAttrs(dp.attributes)
              const sessionId = getAttr(dpAttrs, 'session.id')
              const model = getAttr(dpAttrs, 'model')
              const value = dp.value ?? dp.asDouble ?? (dp.asInt ? Number(dp.asInt) : 0)

              // Map metric names to event types
              let eventName = ''
              let inputTokens = 0
              let outputTokens = 0
              let cacheReadTokens = 0
              let durationMs = 0
              let toolName = ''
              let costUsd = 0

              if (metricName === 'gemini_cli.api.duration' || metricName === 'gemini_cli.api.request.duration') {
                eventName = 'api_request'
                durationMs = value
              } else if (metricName === 'gemini_cli.api.input_tokens' || metricName === 'gemini_cli.token.input.count') {
                eventName = 'api_request'
                inputTokens = value
              } else if (metricName === 'gemini_cli.api.output_tokens' || metricName === 'gemini_cli.token.output.count') {
                eventName = 'api_request'
                outputTokens = value
              } else if (metricName === 'gemini_cli.api.cache_read_tokens' || metricName === 'gemini_cli.token.cache_read.count') {
                eventName = 'api_request'
                cacheReadTokens = value
              } else if (metricName === 'gemini_cli.tool.duration' || metricName === 'gemini_cli.tool_call.duration') {
                eventName = 'tool_result'
                durationMs = value
                toolName = getAttr(dpAttrs, 'function_name') || getAttr(dpAttrs, 'tool_name')
              } else if (metricName === 'gemini_cli.session.count' || metricName === 'gemini_cli.conversation.count') {
                eventName = 'session_start'
              } else {
                // Store all other gemini metrics as raw events
                eventName = metricName.slice(11) // remove 'gemini_cli.' prefix
              }

              if (!eventName) continue

              // Calculate cost if we have tokens
              if (inputTokens > 0 || outputTokens > 0) {
                costUsd = calculateCost(db, model, inputTokens, outputTokens, cacheReadTokens)
              }

              // Parse timestamp
              let timestamp: string
              if (dp.startTime && Array.isArray(dp.startTime) && dp.startTime.length === 2) {
                timestamp = new Date(dp.startTime[0] as number * 1000).toISOString()
              } else if (typeof dp.startTime === 'string' && dp.startTime !== '0') {
                try {
                  const ms = Number(BigInt(dp.startTime) / BigInt(1_000_000))
                  timestamp = new Date(ms).toISOString()
                } catch {
                  timestamp = new Date().toISOString()
                }
              } else {
                timestamp = new Date().toISOString()
              }

              insert.run(
                timestamp,
                'gemini',
                serviceName,
                eventName,
                sessionId,
                '',
                model,
                inputTokens,
                outputTokens,
                cacheReadTokens,
                0,
                costUsd,
                durationMs,
                'normal',
                toolName,
                null,
                'INFO',
                `${metricName}=${value}`,
                '',
                attrsToJson(resAttrs),
                attrsToJson(dpAttrs)
              )
              count++
            }
          }
        }
      }
    })
    tx()

    return NextResponse.json({ accepted: count })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
