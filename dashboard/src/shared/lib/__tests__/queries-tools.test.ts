import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'
import { insertApiRequest, insertToolResult, insertToolDetail } from './test-helpers'

let testDb: Database.Database

vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { getToolUsageStats, getDailyToolStats, getToolDetailStats, getIndividualToolStats } = await import('../queries/tools')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getToolUsageStats', () => {
  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getToolUsageStats('all')).toHaveLength(0)
  })

  it('도구별 사용 통계를 집계한다', () => {
    insertToolResult(testDb, { tool_name: 'bash', tool_success: 1 })
    insertToolResult(testDb, { tool_name: 'bash', tool_success: 1 })
    insertToolResult(testDb, { tool_name: 'bash', tool_success: 0 })
    insertToolResult(testDb, { tool_name: 'read', tool_success: 1 })

    const stats = getToolUsageStats('all')
    expect(stats.length).toBeGreaterThanOrEqual(2)

    const bash = stats.find(s => s.tool_name === 'bash')
    expect(bash).toBeDefined()
    expect(bash!.invocation_count).toBe(3)
    expect(bash!.success_count).toBe(2)
    expect(bash!.fail_count).toBe(1)
  })

  it('invocation_count 내림차순으로 정렬된다', () => {
    insertToolResult(testDb, { tool_name: 'bash' })
    insertToolResult(testDb, { tool_name: 'read' })
    insertToolResult(testDb, { tool_name: 'read' })
    insertToolResult(testDb, { tool_name: 'read' })

    const stats = getToolUsageStats('all')
    expect(stats[0].tool_name).toBe('read')
  })

  it('agent_type 필터가 동작한다', () => {
    insertToolResult(testDb, { agent_type: 'claude', tool_name: 'bash' })
    insertToolResult(testDb, { agent_type: 'codex', tool_name: 'shell' })

    const claudeStats = getToolUsageStats('claude')
    expect(claudeStats.every(s => s.tool_name === 'bash')).toBe(true)
  })

  it('날짜 범위 필터가 동작한다', () => {
    insertToolResult(testDb, { timestamp: '2026-03-10T10:00:00Z', tool_name: 'old-tool' })
    insertToolResult(testDb, { timestamp: '2026-03-15T10:00:00Z', tool_name: 'new-tool' })

    const stats = getToolUsageStats('all', 7, 'all', '2026-03-13', '2026-03-17')
    expect(stats.every(s => s.tool_name === 'new-tool')).toBe(true)
  })
})

describe('getDailyToolStats', () => {
  it('날짜별 도구 사용 통계를 반환한다', () => {
    insertToolResult(testDb, { timestamp: '2026-03-14T10:00:00Z', tool_name: 'bash' })
    insertToolResult(testDb, { timestamp: '2026-03-14T11:00:00Z', tool_name: 'bash' })
    insertToolResult(testDb, { timestamp: '2026-03-15T10:00:00Z', tool_name: 'read' })

    const stats = getDailyToolStats('all', 30)
    const mar14Bash = stats.find(s => s.date === '2026-03-14' && s.tool_name === 'bash')
    expect(mar14Bash).toBeDefined()
    expect(mar14Bash!.count).toBe(2)
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getDailyToolStats('all')).toHaveLength(0)
  })
})

describe('getToolDetailStats', () => {
  it('도구 카테고리를 올바르게 분류한다', () => {
    insertToolResult(testDb, { tool_name: 'bash', prompt_id: 'p1' })
    insertToolResult(testDb, { tool_name: 'mcp__github__create_issue', prompt_id: 'p2' })
    insertToolResult(testDb, { tool_name: 'Agent', prompt_id: 'p3' })

    const stats = getToolDetailStats('all', 30)
    const bash = stats.find(s => s.tool_name === 'bash')
    const mcp = stats.find(s => s.tool_name === 'mcp__github__create_issue')
    const agent = stats.find(s => s.tool_name === 'Agent')

    expect(bash?.category).toBe('Built-in')
    expect(mcp?.category).toBe('MCP')
    expect(agent?.category).toBe('Orchestration')
  })

  it('빈 prompt_id를 가진 도구에서 비용이 중복되지 않는다', () => {
    const now = new Date().toISOString()
    insertToolResult(testDb, { timestamp: now, tool_name: 'shell', prompt_id: '' })
    insertToolResult(testDb, { timestamp: now, tool_name: 'read_file', prompt_id: '' })
    insertApiRequest(testDb, { timestamp: now, prompt_id: '', cost_usd: 5.0 })

    const stats = getToolDetailStats('codex', 30)
    const totalCost = stats.reduce((sum, r) => sum + r.total_cost, 0)
    expect(totalCost).toBeLessThanOrEqual(5.0)
  })
})

describe('getIndividualToolStats', () => {
  it('tool_details 테이블에서 개별 도구 통계를 반환한다', () => {
    insertToolDetail(testDb, { tool_name: 'mcp:github', detail_name: 'create_issue', detail_type: 'mcp', agent_type: 'claude', success: 1 })
    insertToolDetail(testDb, { tool_name: 'mcp:github', detail_name: 'create_issue', detail_type: 'mcp', agent_type: 'claude', success: 1 })
    insertToolDetail(testDb, { tool_name: 'mcp:github', detail_name: 'create_issue', detail_type: 'mcp', agent_type: 'claude', success: 0 })

    const stats = getIndividualToolStats('all', 30)
    expect(stats.length).toBeGreaterThan(0)
    const github = stats.find(s => s.tool_name === 'mcp:github')
    expect(github).toBeDefined()
    expect(github!.invocation_count).toBe(3)
    expect(github!.success_count).toBe(2)
    expect(github!.fail_count).toBe(1)
  })

  it('빈 DB에서 빈 배열을 반환한다', () => {
    expect(getIndividualToolStats('all', 30)).toHaveLength(0)
  })

  it('invocation_count 내림차순으로 정렬된다', () => {
    insertToolDetail(testDb, { tool_name: 'mcp:slack', detail_name: 'send', detail_type: 'mcp' })
    insertToolDetail(testDb, { tool_name: 'mcp:github', detail_name: 'create_issue', detail_type: 'mcp' })
    insertToolDetail(testDb, { tool_name: 'mcp:github', detail_name: 'create_issue', detail_type: 'mcp' })

    const stats = getIndividualToolStats('all', 30)
    expect(stats[0].tool_name).toBe('mcp:github')
  })
})
