import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/shared/lib/db'

let testDb: Database.Database

vi.mock('@/shared/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

import { getToolSingleStat, getToolDailyStats, getToolRelatedSessions } from '../tools'

const insertToolResult = (
  db: Database.Database,
  toolName: string,
  success: 0 | 1,
  sessionId: string,
  projectName: string = 'test-project',
  agentType: string = 'claude',
  durationMs: number = 100,
  timestamp: string = '2026-03-25T10:00:00.000Z',
) => {
  db.prepare(`
    INSERT INTO agent_logs
      (timestamp, event_name, session_id, agent_type, tool_name, tool_success, duration_ms, project_name)
    VALUES (?, 'tool_result', ?, ?, ?, ?, ?, ?)
  `).run(timestamp, sessionId, agentType, toolName, success, durationMs, projectName)
}

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('getToolSingleStat', () => {
  it('해당 도구의 집계 통계를 반환한다', () => {
    insertToolResult(testDb, 'Bash', 1, 'sess-1')
    insertToolResult(testDb, 'Bash', 1, 'sess-1')
    insertToolResult(testDb, 'Bash', 0, 'sess-2')
    insertToolResult(testDb, 'Read', 1, 'sess-1')

    const stat = getToolSingleStat('Bash', 7)

    expect(stat).not.toBeNull()
    expect(stat!.tool_name).toBe('Bash')
    expect(stat!.invocation_count).toBe(3)
    expect(stat!.success_count).toBe(2)
    expect(stat!.fail_count).toBe(1)
    expect(stat!.avg_duration_ms).toBeCloseTo(100)
    expect(stat!.last_used).toBeTruthy()
  })

  it('데이터가 없으면 null을 반환한다', () => {
    const stat = getToolSingleStat('NonExistentTool', 7)
    expect(stat).toBeNull()
  })

  it('다른 도구의 데이터는 포함하지 않는다', () => {
    insertToolResult(testDb, 'Read', 1, 'sess-1')
    insertToolResult(testDb, 'Write', 1, 'sess-1')

    const stat = getToolSingleStat('Read', 7)
    expect(stat!.invocation_count).toBe(1)
  })
})

describe('getToolDailyStats', () => {
  it('일별로 집계된 데이터를 반환한다', () => {
    insertToolResult(testDb, 'Bash', 1, 'sess-1', 'p', 'claude', 100, '2026-03-24T10:00:00.000Z')
    insertToolResult(testDb, 'Bash', 0, 'sess-1', 'p', 'claude', 200, '2026-03-24T11:00:00.000Z')
    insertToolResult(testDb, 'Bash', 1, 'sess-2', 'p', 'claude', 100, '2026-03-25T10:00:00.000Z')

    const daily = getToolDailyStats('Bash', 7)

    expect(daily.length).toBeGreaterThanOrEqual(2)

    const day24 = daily.find((d) => d.date === '2026-03-24')
    expect(day24).toBeDefined()
    expect(day24!.count).toBe(2)
    expect(day24!.success_count).toBe(1)
    expect(day24!.fail_count).toBe(1)

    const day25 = daily.find((d) => d.date === '2026-03-25')
    expect(day25).toBeDefined()
    expect(day25!.count).toBe(1)
  })

  it('데이터가 없으면 빈 배열을 반환한다', () => {
    const daily = getToolDailyStats('NonExistentTool', 7)
    expect(daily).toEqual([])
  })

  it('날짜 오름차순으로 정렬된다', () => {
    insertToolResult(testDb, 'Bash', 1, 'sess-1', 'p', 'claude', 100, '2026-03-25T10:00:00.000Z')
    insertToolResult(testDb, 'Bash', 1, 'sess-1', 'p', 'claude', 100, '2026-03-24T10:00:00.000Z')

    const daily = getToolDailyStats('Bash', 7)
    expect(daily[0].date <= daily[daily.length - 1].date).toBe(true)
  })
})

describe('getToolRelatedSessions', () => {
  it('해당 도구를 사용한 세션 목록을 반환한다', () => {
    insertToolResult(testDb, 'Bash', 1, 'sess-alpha', 'proj-a', 'claude')
    insertToolResult(testDb, 'Bash', 0, 'sess-alpha', 'proj-a', 'claude')
    insertToolResult(testDb, 'Bash', 1, 'sess-beta', 'proj-b', 'codex')
    insertToolResult(testDb, 'Read', 1, 'sess-gamma', 'proj-a', 'claude')

    const sessions = getToolRelatedSessions('Bash', 7)

    expect(sessions.length).toBe(2)

    const alpha = sessions.find((s) => s.session_id === 'sess-alpha')
    expect(alpha).toBeDefined()
    expect(alpha!.call_count).toBe(2)
    expect(alpha!.success_count).toBe(1)
    expect(alpha!.project_name).toBe('proj-a')
    expect(alpha!.agent_type).toBe('claude')
  })

  it('Read 도구를 사용한 세션은 포함하지 않는다', () => {
    insertToolResult(testDb, 'Read', 1, 'sess-gamma', 'proj-a', 'claude')

    const sessions = getToolRelatedSessions('Bash', 7)
    expect(sessions).toHaveLength(0)
  })

  it('limit 파라미터를 준수한다', () => {
    for (let i = 0; i < 25; i++) {
      insertToolResult(testDb, 'Bash', 1, `sess-${i}`)
    }

    const sessions = getToolRelatedSessions('Bash', 7, 10)
    expect(sessions.length).toBeLessThanOrEqual(10)
  })
})
