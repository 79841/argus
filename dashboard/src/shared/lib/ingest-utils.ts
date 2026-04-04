import type Database from 'better-sqlite3'
import { AGENT_TOOL_CATEGORIES } from './agents'

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

export type DetectedAgent = 'claude' | 'codex' | 'gemini' | 'unknown'

const SERVICE_NAME_MAP = new Map<string, DetectedAgent>([
  ['claude-code', 'claude'],
  ['codex-cli', 'codex'],
  ['codex_cli_rs', 'codex'],
  ['codex-app-server', 'codex'],
  ['codex_exec', 'codex'],
  ['gemini-cli', 'gemini'],
])

const EVENT_PREFIX_MAP: [string, DetectedAgent][] = [
  ['claude_code.', 'claude'],
  ['codex.', 'codex'],
  ['gemini_cli.', 'gemini'],
]

export const detectAgentFromEvent = (eventName: string): DetectedAgent | undefined => {
  for (const [prefix, agent] of EVENT_PREFIX_MAP) {
    if (eventName.startsWith(prefix)) return agent
  }
  return undefined
}

export const detectAgentType = (serviceName: string, eventName?: string): DetectedAgent => {
  const lower = serviceName.toLowerCase()

  const exact = SERVICE_NAME_MAP.get(lower)
  if (exact) return exact

  if (eventName) {
    const fromEvent = detectAgentFromEvent(eventName)
    if (fromEvent) return fromEvent
  }

  if (lower.includes('claude')) return 'claude'
  if (lower.includes('codex')) return 'codex'
  if (lower.includes('gemini')) return 'gemini'

  return 'unknown'
}

const GEMINI_SKIP_EVENTS = new Set([
  'tool_output_truncated', 'malformed_json_response', 'flash_fallback',
  'chat_compression', 'model_routing', 'slash_command', 'conversation_finished',
  'rewind', 'next_speaker_check', 'ide_connection', 'tool_output_masked',
  'ripgrep_fallback', 'network_retry_attempt',
  'startup_stats', 'llm_loop_check', 'hook_call',
  'edit_strategy', 'edit_correction', 'web_fetch_fallback_attempt',
  'overage_menu_shown', 'overage_option_selected', 'empty_wallet_menu_shown',
  'credit_purchase_click', 'credits_used',
])

const GEMINI_SKIP_PREFIXES = [
  'chat.', 'extension_', 'conseca.',
  'onboarding.', 'approval_mode', 'agent.', 'keychain.', 'plan.', 'token_storage.',
]

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
    if (GEMINI_SKIP_EVENTS.has(name)) return ''
    if (GEMINI_SKIP_PREFIXES.some((p) => name.startsWith(p))) return ''
    return name
  }
  if (raw.startsWith('gen_ai.')) return ''
  return raw
}

export const getTokenAttr = (attrs: KeyValue[] | undefined, claudeKey: string, codexKey: string, geminiKey?: string): number => {
  const val = getNumAttr(attrs, claudeKey)
  if (val > 0) return val
  const codexVal = getNumAttr(attrs, codexKey)
  if (codexVal > 0) return codexVal
  return geminiKey ? getNumAttr(attrs, geminiKey) : 0
}

export const getSessionId = (attrs: KeyValue[] | undefined): string => {
  return getAttr(attrs, 'session.id') || getAttr(attrs, 'conversation.id')
}

export const getToolParams = (attrs: KeyValue[] | undefined): string => {
  return getAttr(attrs, 'tool_parameters') || getAttr(attrs, 'tool_input')
}

export const normalizeModelId = (model: string): string => {
  return model.replace(/^models\//, '')
}

let _pricingStmt: Database.Statement<[string, string]> | null = null
let _pricingDb: Database.Database | null = null

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

  if (!_pricingStmt || _pricingDb !== db) {
    _pricingStmt = db.prepare(
      `SELECT input_per_mtok, output_per_mtok, cache_read_per_mtok FROM pricing_model
       WHERE model_id = ? OR ? LIKE model_id || '-%'
       ORDER BY length(model_id) DESC, effective_date DESC LIMIT 1`
    )
    _pricingDb = db
  }

  const pricing = _pricingStmt.get(normalized, normalized) as { input_per_mtok: number; output_per_mtok: number; cache_read_per_mtok: number } | undefined

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

const TOOL_CATEGORY_MAP = new Map(
  Object.entries(AGENT_TOOL_CATEGORIES).flatMap(([cat, tools]) =>
    tools.map((t): [string, string] => [t, cat])
  )
)

export const getToolCategory = (toolName: string): string =>
  TOOL_CATEGORY_MAP.get(toolName) ?? (toolName.startsWith('mcp') ? 'MCP' : 'Other')

export const extractProjectFromArgs = (attrs: KeyValue[] | undefined): string => {
  const args = getAttr(attrs, 'arguments')
  if (!args) return ''
  try {
    const parsed = JSON.parse(args) as { workdir?: string }
    if (parsed.workdir) {
      const parts = parsed.workdir.split(/[/\\]/)
      return parts[parts.length - 1] || ''
    }
  } catch { /* ignore */ }
  return ''
}

export const extractFilePathFromToolParams = (attrs: KeyValue[] | undefined): string => {
  const params = getToolParams(attrs)
  if (!params) return ''
  try {
    const parsed = JSON.parse(params) as Record<string, unknown>
    const filePath = parsed.file_path ?? parsed.path
    if (typeof filePath === 'string' && filePath.startsWith('/')) return filePath
  } catch { /* ignore */ }
  return ''
}

export const matchProjectByPath = (
  filePath: string,
  registry: { project_name: string; project_path: string }[],
): string => {
  if (!filePath) return ''
  for (const entry of registry) {
    if (filePath.startsWith(entry.project_path + '/') || filePath === entry.project_path) {
      return entry.project_name
    }
  }
  return ''
}
