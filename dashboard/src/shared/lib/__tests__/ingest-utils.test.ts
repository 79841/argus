import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import {
  getVal, getAttr, getNumAttr, detectAgentType, normalizeEventName,
  getTokenAttr, getSessionId, normalizeModelId, calculateCost,
  parseTimestamp, attrsToJson, extractMcpServer, getErrorMessage,
  getStatusCode, extractProjectFromArgs, getToolCategory,
} from '../ingest-utils'
import type { KeyValue } from '../ingest-utils'
import { initSchema } from '../db'

const mkAttr = (key: string, value: string): KeyValue => ({
  key,
  value: { stringValue: value },
})

const mkIntAttr = (key: string, value: number): KeyValue => ({
  key,
  value: { intValue: value },
})

const mkDoubleAttr = (key: string, value: number): KeyValue => ({
  key,
  value: { doubleValue: value },
})



// --- getVal ---

describe('getVal', () => {
  it('returns stringValue', () => {
    expect(getVal({ stringValue: 'hello' })).toBe('hello')
  })
  it('returns intValue as string', () => {
    expect(getVal({ intValue: 42 })).toBe('42')
    expect(getVal({ intValue: '100' })).toBe('100')
  })
  it('returns doubleValue as string', () => {
    expect(getVal({ doubleValue: 3.14 })).toBe('3.14')
  })
  it('returns boolValue as string', () => {
    expect(getVal({ boolValue: true })).toBe('true')
    expect(getVal({ boolValue: false })).toBe('false')
  })
  it('returns empty string for undefined', () => {
    expect(getVal(undefined)).toBe('')
  })
  it('returns empty string for empty object', () => {
    expect(getVal({})).toBe('')
  })
})

// --- getAttr ---

describe('getAttr', () => {
  it('finds attribute by key', () => {
    const attrs = [mkAttr('model', 'gpt-4')]
    expect(getAttr(attrs, 'model')).toBe('gpt-4')
  })
  it('returns empty string for missing key', () => {
    const attrs = [mkAttr('model', 'gpt-4')]
    expect(getAttr(attrs, 'missing')).toBe('')
  })
  it('returns empty string for undefined attrs', () => {
    expect(getAttr(undefined, 'any')).toBe('')
  })
  it('returns empty string for empty attrs', () => {
    expect(getAttr([], 'any')).toBe('')
  })
})

// --- getNumAttr ---

describe('getNumAttr', () => {
  it('extracts numeric value', () => {
    expect(getNumAttr([mkDoubleAttr('cost', 1.5)], 'cost')).toBe(1.5)
    expect(getNumAttr([mkIntAttr('tokens', 100)], 'tokens')).toBe(100)
  })
  it('returns 0 for missing key', () => {
    expect(getNumAttr([], 'cost')).toBe(0)
  })
})

// --- detectAgentType ---

describe('detectAgentType', () => {
  it('detects codex', () => {
    expect(detectAgentType('codex-cli')).toBe('codex')
    expect(detectAgentType('codex_cli_rs')).toBe('codex')
  })
  it('detects claude', () => {
    expect(detectAgentType('claude-code')).toBe('claude')
  })
  it('detects gemini', () => {
    expect(detectAgentType('gemini-cli')).toBe('gemini')
  })
  it('defaults to claude for unknown', () => {
    expect(detectAgentType('unknown-service')).toBe('claude')
  })
  it('is case insensitive', () => {
    expect(detectAgentType('Codex')).toBe('codex')
    expect(detectAgentType('GEMINI-CLI')).toBe('gemini')
  })
})

// --- normalizeEventName ---

describe('normalizeEventName', () => {
  describe('Claude Code', () => {
    it('strips claude_code. prefix', () => {
      expect(normalizeEventName('claude_code.api_request')).toBe('api_request')
      expect(normalizeEventName('claude_code.user_prompt')).toBe('user_prompt')
      expect(normalizeEventName('claude_code.tool_result')).toBe('tool_result')
      expect(normalizeEventName('claude_code.api_error')).toBe('api_error')
      expect(normalizeEventName('claude_code.tool_decision')).toBe('tool_decision')
    })
  })

  describe('Codex', () => {
    it('maps sse_event response.completed to api_request', () => {
      const attrs = [mkAttr('event.kind', 'response.completed')]
      expect(normalizeEventName('codex.sse_event', attrs)).toBe('api_request')
    })
    it('maps sse_event error to api_error', () => {
      const attrs = [mkAttr('event.kind', 'error')]
      expect(normalizeEventName('codex.sse_event', attrs)).toBe('api_error')
    })
    it('maps sse_event response.failed to api_error', () => {
      const attrs = [mkAttr('event.kind', 'response.failed')]
      expect(normalizeEventName('codex.sse_event', attrs)).toBe('api_error')
    })
    it('skips sse_event with other kinds', () => {
      const attrs = [mkAttr('event.kind', 'response.output_item.added')]
      expect(normalizeEventName('codex.sse_event', attrs)).toBe('')
    })
    it('maps websocket_event response.completed to api_request', () => {
      const attrs = [mkAttr('event.kind', 'response.completed')]
      expect(normalizeEventName('codex.websocket_event', attrs)).toBe('api_request')
    })
    it('maps websocket_event error to api_error', () => {
      const attrs = [mkAttr('event.kind', 'error')]
      expect(normalizeEventName('codex.websocket_event', attrs)).toBe('api_error')
    })
    it('skips api_request and websocket_request', () => {
      expect(normalizeEventName('codex.api_request')).toBe('')
      expect(normalizeEventName('codex.websocket_request')).toBe('')
    })
    it('maps conversation_starts to session_start', () => {
      expect(normalizeEventName('codex.conversation_starts')).toBe('session_start')
    })
    it('passes through other codex events', () => {
      expect(normalizeEventName('codex.user_prompt')).toBe('user_prompt')
      expect(normalizeEventName('codex.tool_result')).toBe('tool_result')
    })
  })

  describe('Gemini CLI', () => {
    it('maps api_response to api_request', () => {
      expect(normalizeEventName('gemini_cli.api_response')).toBe('api_request')
    })
    it('skips gemini api_request', () => {
      expect(normalizeEventName('gemini_cli.api_request')).toBe('')
    })
    it('maps tool_call to tool_result', () => {
      expect(normalizeEventName('gemini_cli.tool_call')).toBe('tool_result')
    })
    it('maps config to session_start', () => {
      expect(normalizeEventName('gemini_cli.config')).toBe('session_start')
    })
    it('skips noise events', () => {
      expect(normalizeEventName('gemini_cli.tool_output_truncated')).toBe('')
      expect(normalizeEventName('gemini_cli.malformed_json_response')).toBe('')
      expect(normalizeEventName('gemini_cli.flash_fallback')).toBe('')
      expect(normalizeEventName('gemini_cli.chat_compression')).toBe('')
      expect(normalizeEventName('gemini_cli.model_routing')).toBe('')
      expect(normalizeEventName('gemini_cli.slash_command')).toBe('')
      expect(normalizeEventName('gemini_cli.conversation_finished')).toBe('')
      expect(normalizeEventName('gemini_cli.rewind')).toBe('')
      expect(normalizeEventName('gemini_cli.next_speaker_check')).toBe('')
      expect(normalizeEventName('gemini_cli.ide_connection')).toBe('')
      expect(normalizeEventName('gemini_cli.tool_output_masked')).toBe('')
      expect(normalizeEventName('gemini_cli.ripgrep_fallback')).toBe('')
    })
    it('skips v0.35 renamed network_retry_attempt (was retry_attempt)', () => {
      expect(normalizeEventName('gemini_cli.network_retry_attempt')).toBe('')
    })
    it('does not skip legacy retry_attempt — passes through as unknown event', () => {
      expect(normalizeEventName('gemini_cli.retry_attempt')).toBe('retry_attempt')
    })
    it('skips v0.35 single events', () => {
      expect(normalizeEventName('gemini_cli.startup_stats')).toBe('')
      expect(normalizeEventName('gemini_cli.llm_loop_check')).toBe('')
      expect(normalizeEventName('gemini_cli.hook_call')).toBe('')
      expect(normalizeEventName('gemini_cli.edit_strategy')).toBe('')
      expect(normalizeEventName('gemini_cli.edit_correction')).toBe('')
      expect(normalizeEventName('gemini_cli.web_fetch_fallback_attempt')).toBe('')
    })
    it('skips billing events', () => {
      expect(normalizeEventName('gemini_cli.overage_menu_shown')).toBe('')
      expect(normalizeEventName('gemini_cli.overage_option_selected')).toBe('')
      expect(normalizeEventName('gemini_cli.empty_wallet_menu_shown')).toBe('')
      expect(normalizeEventName('gemini_cli.credit_purchase_click')).toBe('')
      expect(normalizeEventName('gemini_cli.credits_used')).toBe('')
    })
    it('skips pattern-based events', () => {
      expect(normalizeEventName('gemini_cli.chat.some_event')).toBe('')
      expect(normalizeEventName('gemini_cli.extension_install')).toBe('')
      expect(normalizeEventName('gemini_cli.conseca.check')).toBe('')
    })
    it('skips v0.35 prefix-based events', () => {
      expect(normalizeEventName('gemini_cli.onboarding.step1')).toBe('')
      expect(normalizeEventName('gemini_cli.approval_mode_set')).toBe('')
      expect(normalizeEventName('gemini_cli.agent.start')).toBe('')
      expect(normalizeEventName('gemini_cli.keychain.read')).toBe('')
      expect(normalizeEventName('gemini_cli.plan.created')).toBe('')
      expect(normalizeEventName('gemini_cli.token_storage.saved')).toBe('')
    })
    it('passes through other gemini events', () => {
      expect(normalizeEventName('gemini_cli.user_prompt')).toBe('user_prompt')
      expect(normalizeEventName('gemini_cli.file_operation')).toBe('file_operation')
    })
  })

  describe('gen_ai prefix', () => {
    it('skips all gen_ai.* events', () => {
      expect(normalizeEventName('gen_ai.client.inference.operation.details')).toBe('')
      expect(normalizeEventName('gen_ai.something')).toBe('')
    })
  })

  describe('unknown prefix', () => {
    it('passes through unknown events', () => {
      expect(normalizeEventName('custom_event')).toBe('custom_event')
    })
  })
})

// --- getTokenAttr ---

describe('getTokenAttr', () => {
  it('uses claude key when available', () => {
    const attrs = [mkIntAttr('input_tokens', 100), mkIntAttr('input_token_count', 50)]
    expect(getTokenAttr(attrs, 'input_tokens', 'input_token_count')).toBe(100)
  })
  it('falls back to codex key', () => {
    const attrs = [mkIntAttr('input_token_count', 50)]
    expect(getTokenAttr(attrs, 'input_tokens', 'input_token_count')).toBe(50)
  })
  it('returns 0 when neither exists', () => {
    expect(getTokenAttr([], 'input_tokens', 'input_token_count')).toBe(0)
  })
  it('falls back to gemini key (cached_content_token_count)', () => {
    const attrs = [mkIntAttr('cached_content_token_count', 200)]
    expect(getTokenAttr(attrs, 'cache_read_tokens', 'cached_token_count', 'cached_content_token_count')).toBe(200)
  })
  it('prefers claude key over gemini key', () => {
    const attrs = [mkIntAttr('cache_read_tokens', 100), mkIntAttr('cached_content_token_count', 200)]
    expect(getTokenAttr(attrs, 'cache_read_tokens', 'cached_token_count', 'cached_content_token_count')).toBe(100)
  })
  it('returns 0 when all three keys are missing', () => {
    expect(getTokenAttr([], 'cache_read_tokens', 'cached_token_count', 'cached_content_token_count')).toBe(0)
  })
  it('supports reasoning token fallback (thoughts_token_count)', () => {
    const attrs = [mkIntAttr('thoughts_token_count', 500)]
    expect(getTokenAttr(attrs, 'reasoning_token_count', 'thoughts_token_count')).toBe(500)
  })
})

// --- getSessionId ---

describe('getSessionId', () => {
  it('uses session.id', () => {
    const attrs = [mkAttr('session.id', 'abc')]
    expect(getSessionId(attrs)).toBe('abc')
  })
  it('falls back to conversation.id', () => {
    const attrs = [mkAttr('conversation.id', 'xyz')]
    expect(getSessionId(attrs)).toBe('xyz')
  })
  it('returns empty when neither exists', () => {
    expect(getSessionId([])).toBe('')
  })
})

// --- normalizeModelId ---

describe('normalizeModelId', () => {
  it('strips models/ prefix', () => {
    expect(normalizeModelId('models/gemini-2.5-pro')).toBe('gemini-2.5-pro')
  })
  it('keeps model without prefix unchanged', () => {
    expect(normalizeModelId('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
    expect(normalizeModelId('gpt-4.1')).toBe('gpt-4.1')
  })
  it('handles empty string', () => {
    expect(normalizeModelId('')).toBe('')
  })
})

// --- parseTimestamp ---

describe('parseTimestamp', () => {
  it('converts nanoseconds to ISO string', () => {
    const nanos = '1710000000000000000'
    const result = parseTimestamp(nanos)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(new Date(result).getTime()).toBe(1710000000000)
  })
  it('falls back to event.timestamp attribute', () => {
    const attrs = [mkAttr('event.timestamp', '2026-03-13T10:00:00.000Z')]
    expect(parseTimestamp('0', attrs)).toBe('2026-03-13T10:00:00.000Z')
  })
  it('falls back to current time when no sources', () => {
    const before = Date.now()
    const result = parseTimestamp(undefined)
    const after = Date.now()
    const ts = new Date(result).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})

// --- attrsToJson ---

describe('attrsToJson', () => {
  it('converts attrs to JSON string', () => {
    const attrs = [mkAttr('a', '1'), mkAttr('b', '2')]
    expect(JSON.parse(attrsToJson(attrs))).toEqual({ a: '1', b: '2' })
  })
  it('returns {} for undefined', () => {
    expect(attrsToJson(undefined)).toBe('{}')
  })
  it('returns {} for empty array', () => {
    expect(attrsToJson([])).toBe('{}')
  })
})

// --- extractMcpServer ---

describe('extractMcpServer', () => {
  it('extracts server name from mcp__ pattern', () => {
    expect(extractMcpServer('mcp__github__create_issue')).toBe('github')
    expect(extractMcpServer('mcp__slack__send_message')).toBe('slack')
  })
  it('returns original name when pattern does not match', () => {
    expect(extractMcpServer('Read')).toBe('Read')
    expect(extractMcpServer('mcp_tool')).toBe('mcp_tool')
  })
})

// --- getErrorMessage / getStatusCode ---

describe('getErrorMessage', () => {
  it('uses error attribute', () => {
    expect(getErrorMessage([mkAttr('error', 'timeout')])).toBe('timeout')
  })
  it('falls back to error.message', () => {
    expect(getErrorMessage([mkAttr('error.message', 'fail')])).toBe('fail')
  })
  it('returns empty when no error attrs', () => {
    expect(getErrorMessage([])).toBe('')
  })
})

describe('getStatusCode', () => {
  it('uses status_code attribute', () => {
    expect(getStatusCode([mkAttr('status_code', '429')])).toBe('429')
  })
  it('falls back to http.response.status_code', () => {
    expect(getStatusCode([mkAttr('http.response.status_code', '500')])).toBe('500')
  })
  it('returns empty when no status attrs', () => {
    expect(getStatusCode([])).toBe('')
  })
})

// --- extractProjectFromArgs ---

describe('extractProjectFromArgs', () => {
  it('extracts project from workdir', () => {
    const attrs = [mkAttr('arguments', '{"workdir":"/home/user/argus"}')]
    expect(extractProjectFromArgs(attrs)).toBe('argus')
  })
  it('returns empty for invalid JSON', () => {
    const attrs = [mkAttr('arguments', 'not-json')]
    expect(extractProjectFromArgs(attrs)).toBe('')
  })
  it('returns empty when no arguments attr', () => {
    expect(extractProjectFromArgs([])).toBe('')
  })
  it('returns empty when workdir not in arguments', () => {
    const attrs = [mkAttr('arguments', '{"command":"ls"}')]
    expect(extractProjectFromArgs(attrs)).toBe('')
  })
})

// --- getToolCategory ---

describe('getToolCategory', () => {
  it('maps Claude Code file read tool', () => {
    expect(getToolCategory('Read')).toBe('File Read')
  })
  it('maps Gemini CLI file read tool', () => {
    expect(getToolCategory('read_file')).toBe('File Read')
  })
  it('maps file write tools', () => {
    expect(getToolCategory('Write')).toBe('File Write')
    expect(getToolCategory('write_file')).toBe('File Write')
    expect(getToolCategory('patch_file')).toBe('File Write')
  })
  it('maps file edit tools', () => {
    expect(getToolCategory('Edit')).toBe('File Edit')
    expect(getToolCategory('edit_file')).toBe('File Edit')
  })
  it('maps shell tools across agents', () => {
    expect(getToolCategory('Bash')).toBe('Shell')
    expect(getToolCategory('shell')).toBe('Shell')
    expect(getToolCategory('run_shell_command')).toBe('Shell')
  })
  it('maps search tools', () => {
    expect(getToolCategory('Glob')).toBe('Search')
    expect(getToolCategory('Grep')).toBe('Search')
    expect(getToolCategory('list_directory')).toBe('Search')
    expect(getToolCategory('web_search')).toBe('Search')
  })
  it('maps orchestration tools', () => {
    expect(getToolCategory('Agent')).toBe('Orchestration')
    expect(getToolCategory('Skill')).toBe('Orchestration')
  })
  it('maps MCP tools by prefix', () => {
    expect(getToolCategory('mcp__linear__create_issue')).toBe('MCP')
    expect(getToolCategory('mcp__github__pr')).toBe('MCP')
  })
  it('returns Other for unknown tools', () => {
    expect(getToolCategory('unknown_tool')).toBe('Other')
    expect(getToolCategory('CustomTool')).toBe('Other')
  })
})

// --- calculateCost ---

describe('calculateCost', () => {
  const createTestDb = (): Database.Database => {
    const db = new Database(':memory:')
    initSchema(db)
    return db
  }

  it('calculates cost with exact model match', () => {
    const db = createTestDb()
    // gpt-4.1: input=2.0, output=8.0, cache_read=0.5
    const cost = calculateCost(db, 'gpt-4.1', 1000, 500, 200)
    expect(cost).toBeCloseTo((1000 * 2.0 + 500 * 8.0 + 200 * 0.5) / 1_000_000)
  })

  it('calculates cost with fuzzy model match (date suffix)', () => {
    const db = createTestDb()
    const cost = calculateCost(db, 'gpt-4.1-2025-04-14', 1000, 500, 200)
    expect(cost).toBeCloseTo((1000 * 2.0 + 500 * 8.0 + 200 * 0.5) / 1_000_000)
  })

  it('uses longest match to pick correct model', () => {
    const db = createTestDb()
    // gpt-4.1-mini should match, not gpt-4.1
    const cost = calculateCost(db, 'gpt-4.1-mini-2025-04-14', 1000, 500, 0)
    expect(cost).toBeCloseTo((1000 * 0.4 + 500 * 1.6) / 1_000_000)
  })

  it('normalizes models/ prefix for Gemini', () => {
    const db = createTestDb()
    const cost = calculateCost(db, 'models/gemini-2.5-pro', 1000, 500, 200)
    expect(cost).toBeCloseTo((1000 * 1.25 + 500 * 10.0 + 200 * 0.3125) / 1_000_000)
  })

  it('returns 0 for unknown model', () => {
    const db = createTestDb()
    expect(calculateCost(db, 'unknown-model', 1000, 500, 0)).toBe(0)
  })

  it('returns 0 for empty model', () => {
    const db = createTestDb()
    expect(calculateCost(db, '', 1000, 500, 0)).toBe(0)
  })

  it('includes reasoning tokens at output rate (PER-21)', () => {
    const db = createTestDb()
    // gpt-4.1: input=2.0, output=8.0
    // 1M reasoning tokens at output rate = $8.0
    const cost = calculateCost(db, 'gpt-4.1', 0, 0, 0, 1_000_000)
    expect(cost).toBe(8.0)
  })

  it('handles reasoning tokens for Gemini thinking', () => {
    const db = createTestDb()
    // gemini-2.5-pro: output=10.0
    // 1M reasoning tokens at output rate = $10.0
    const cost = calculateCost(db, 'gemini-2.5-pro', 0, 0, 0, 1_000_000)
    expect(cost).toBe(10.0)
  })
})
