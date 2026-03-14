import type Database from 'better-sqlite3'

export type AnyValue = {
  stringValue?: string
  intValue?: string | number
  doubleValue?: number
  boolValue?: boolean
}

export type KeyValue = {
  key: string
  value: AnyValue
}

export type OtlpLogRecord = {
  timeUnixNano?: string
  observedTimeUnixNano?: string
  severityText?: string
  severityNumber?: number
  body?: AnyValue
  attributes?: KeyValue[]
}

export type OtlpResourceLog = {
  resource?: {
    attributes?: KeyValue[]
  }
  scopeLogs?: Array<{
    scope?: { name?: string }
    logRecords?: OtlpLogRecord[]
  }>
}

export type OtlpLogsRequest = {
  resourceLogs?: OtlpResourceLog[]
}

export const getVal = (kv: AnyValue | undefined): string => {
  if (!kv) return ''
  if (kv.stringValue !== undefined) return kv.stringValue
  if (kv.intValue !== undefined) return String(kv.intValue)
  if (kv.doubleValue !== undefined) return String(kv.doubleValue)
  if (kv.boolValue !== undefined) return String(kv.boolValue)
  return ''
}

export const getAttr = (attrs: KeyValue[] | undefined, key: string): string => {
  const kv = attrs?.find((a) => a.key === key)
  return kv ? getVal(kv.value) : ''
}

export const getNumAttr = (attrs: KeyValue[] | undefined, key: string): number => {
  const val = getAttr(attrs, key)
  return val ? Number(val) : 0
}

export const detectAgentType = (serviceName: string): string => {
  const lower = serviceName.toLowerCase()
  if (lower.includes('codex')) return 'codex'
  if (lower.includes('claude')) return 'claude'
  if (lower.includes('gemini')) return 'gemini'
  return 'claude'
}

export const normalizeEventName = (raw: string, attrs?: KeyValue[]): string => {
  if (raw.startsWith('codex.')) {
    const name = raw.slice(6)
    if (name === 'sse_event') {
      const kind = attrs ? getAttr(attrs, 'event.kind') : ''
      if (kind === 'response.completed') return 'api_request'
      if (kind === 'error' || kind === 'response.failed') return 'api_error'
      return ''
    }
    if (name === 'websocket_event') {
      const kind = attrs ? getAttr(attrs, 'event.kind') : ''
      if (kind === 'response.completed') return 'api_request'
      if (kind === 'error' || kind === 'response.failed') return 'api_error'
      return ''
    }
    if (name === 'api_request' || name === 'websocket_request') return ''
    if (name === 'conversation_starts') return 'session_start'
    return name
  }
  if (raw.startsWith('claude_code.')) {
    return raw.slice(12)
  }
  if (raw.startsWith('gemini_cli.')) {
    const name = raw.slice(11)
    if (name === 'api_response') return 'api_request'
    if (name === 'api_request') return ''
    if (name === 'tool_call') return 'tool_result'
    if (name === 'config') return 'session_start'
    if (name === 'tool_output_truncated' || name === 'malformed_json_response' || name === 'flash_fallback' || name === 'chat_compression' || name === 'model_routing' || name === 'slash_command' || name === 'conversation_finished') return ''
    if (name === 'rewind' || name === 'next_speaker_check' || name === 'ide_connection' || name === 'tool_output_masked' || name === 'ripgrep_fallback' || name === 'retry_attempt') return ''
    if (name.startsWith('chat.') || name.startsWith('extension_') || name.startsWith('conseca.')) return ''
    return name
  }
  if (raw.startsWith('gen_ai.')) return ''
  return raw
}

export const getTokenAttr = (attrs: KeyValue[] | undefined, claudeKey: string, codexKey: string): number => {
  const val = getNumAttr(attrs, claudeKey)
  if (val > 0) return val
  return getNumAttr(attrs, codexKey)
}

export const getSessionId = (attrs: KeyValue[] | undefined): string => {
  return getAttr(attrs, 'session.id') || getAttr(attrs, 'conversation.id')
}

export const normalizeModelId = (model: string): string => {
  return model.replace(/^models\//, '')
}

export const calculateCost = (
  db: Database.Database,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  reasoningTokens: number = 0
): number => {
  if (!model) return 0
  const normalized = normalizeModelId(model)

  const pricing = db.prepare(
    `SELECT input_per_mtok, output_per_mtok, cache_read_per_mtok FROM pricing_model
     WHERE model_id = ? OR ? LIKE model_id || '-%'
     ORDER BY length(model_id) DESC, effective_date DESC LIMIT 1`
  ).get(normalized, normalized) as { input_per_mtok: number; output_per_mtok: number; cache_read_per_mtok: number } | undefined

  if (!pricing) return 0
  return (
    (inputTokens * pricing.input_per_mtok +
      outputTokens * pricing.output_per_mtok +
      cacheReadTokens * pricing.cache_read_per_mtok +
      reasoningTokens * pricing.output_per_mtok) / 1_000_000
  )
}

export const parseTimestamp = (nanos: string | undefined, attrs?: KeyValue[]): string => {
  if (nanos && nanos !== '0') {
    try {
      const ms = Number(BigInt(nanos) / BigInt(1_000_000))
      if (ms > 0) return new Date(ms).toISOString()
    } catch { /* fall through */ }
  }
  if (attrs) {
    const eventTs = getAttr(attrs, 'event.timestamp')
    if (eventTs) return eventTs
  }
  return new Date().toISOString()
}

export const attrsToJson = (attrs: KeyValue[] | undefined): string => {
  if (!attrs || attrs.length === 0) return '{}'
  return JSON.stringify(Object.fromEntries(attrs.map((a) => [a.key, getVal(a.value)])))
}

export const extractMcpServer = (toolName: string): string => {
  const match = toolName.match(/^mcp__([^_]+)__/)
  return match ? match[1] : toolName
}

export const getErrorMessage = (attrs: KeyValue[] | undefined): string => {
  return getAttr(attrs, 'error') || getAttr(attrs, 'error.message') || ''
}

export const getStatusCode = (attrs: KeyValue[] | undefined): string => {
  return getAttr(attrs, 'status_code') || getAttr(attrs, 'http.response.status_code') || ''
}

export const extractProjectFromArgs = (attrs: KeyValue[] | undefined): string => {
  const args = getAttr(attrs, 'arguments')
  if (!args) return ''
  try {
    const parsed = JSON.parse(args) as { workdir?: string }
    if (parsed.workdir) {
      const parts = parsed.workdir.split('/')
      return parts[parts.length - 1] || ''
    }
  } catch { /* ignore */ }
  return ''
}
