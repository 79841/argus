/**
 * OTLP HTTP standard endpoint: POST /v1/metrics
 * Receives Gemini CLI and Claude Code metrics and stores them in SQLite.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/shared/lib/db'
import { detectAgentType, getAttr, attrsToJson } from '@/shared/lib/ingest-utils'
import type { AnyValue, KeyValue } from '@/shared/lib/ingest-utils'

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

const parseMetricTimestamp = (dp: DataPoint): string => {
  if (dp.startTime && Array.isArray(dp.startTime) && dp.startTime.length === 2) {
    return new Date(dp.startTime[0] as number * 1000).toISOString()
  }
  if (typeof dp.startTime === 'string' && dp.startTime !== '0') {
    try {
      const ms = Number(BigInt(dp.startTime) / BigInt(1_000_000))
      return new Date(ms).toISOString()
    } catch {
      return new Date().toISOString()
    }
  }
  return new Date().toISOString()
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
      } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

            const dataPoints = metric.sum?.dataPoints || metric.gauge?.dataPoints || []

            // Route by agent prefix
            if (metricName.startsWith('gemini_cli.')) {
              for (const dp of dataPoints) {
                const dpAttrs = normalizeMetricAttrs(dp.attributes)
                const sessionId = getAttr(dpAttrs, 'session.id')
                const model = getAttr(dpAttrs, 'model')
                const value = dp.value ?? dp.asDouble ?? (dp.asInt ? Number(dp.asInt) : 0)

                let eventName = ''
                let durationMs = 0
                let toolName = ''

                if (metricName === 'gemini_cli.tool.duration' || metricName === 'gemini_cli.tool_call.duration') {
                  eventName = 'tool_result'
                  durationMs = value
                  toolName = getAttr(dpAttrs, 'function_name') || getAttr(dpAttrs, 'tool_name')
                } else if (metricName === 'gemini_cli.session.count' || metricName === 'gemini_cli.conversation.count') {
                  eventName = 'session_start'
                } else {
                  continue
                }

                const timestamp = parseMetricTimestamp(dp)

                insert.run(
                  timestamp,
                  'gemini',
                  serviceName,
                  eventName,
                  sessionId,
                  '',
                  model,
                  0,
                  0,
                  0,
                  0,
                  0,
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
            } else if (metricName.startsWith('claude_code.')) {
              const eventMap: Record<string, string> = {
                'claude_code.lines_of_code.count': 'lines_of_code',
                'claude_code.commit.count': 'commit_count',
                'claude_code.pull_request.count': 'pull_request_count',
                'claude_code.active_time.total': 'active_time',
              }

              const eventName = eventMap[metricName]
              if (!eventName) continue

              for (const dp of dataPoints) {
                const dpAttrs = normalizeMetricAttrs(dp.attributes)
                const sessionId = getAttr(dpAttrs, 'session.id')
                const model = getAttr(dpAttrs, 'model')
                const value = dp.value ?? dp.asDouble ?? (dp.asInt ? Number(dp.asInt) : 0)
                const timestamp = parseMetricTimestamp(dp)
                const agentType = serviceName ? detectAgentType(serviceName) : 'claude'

                insert.run(
                  timestamp,
                  agentType,
                  serviceName,
                  eventName,
                  sessionId,
                  '',
                  model,
                  0,
                  0,
                  0,
                  0,
                  0,
                  eventName === 'active_time' ? value : 0,
                  'normal',
                  '',
                  null,
                  'INFO',
                  `${metricName}=${value}`,
                  '',
                  attrsToJson(resAttrs),
                  attrsToJson(dpAttrs)
                )
                count++
              }
            } else {
              continue
            }
          }
        }
      }
    })
    tx()

    return NextResponse.json({ accepted: count })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
