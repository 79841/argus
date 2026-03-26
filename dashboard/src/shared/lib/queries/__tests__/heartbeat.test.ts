import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

let testDb: Database.Database

vi.mock('@/shared/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

import { getHeartbeatData } from '../heartbeat'
import { createTestDb, insertApiRequest } from '@/shared/lib/__tests__/test-helpers'

beforeEach(() => {
  testDb = createTestDb()
})

describe('getHeartbeatData', () => {
  it('에이전트별 시계열 데이터를 반환한다', () => {
    const now = new Date()
    const ts = new Date(now.getTime() - 60_000).toISOString()

    insertApiRequest(testDb, {
      agent_type: 'claude',
      input_tokens: 1000,
      output_tokens: 500,
      timestamp: ts,
    })
    insertApiRequest(testDb, {
      agent_type: 'codex',
      input_tokens: 200,
      output_tokens: 100,
      timestamp: ts,
    })

    const result = getHeartbeatData('all', 5)

    expect(result.length).toBeGreaterThanOrEqual(1)
    const claudeRow = result.find((r) => r.agent_type === 'claude')
    expect(claudeRow).toBeDefined()
    expect(claudeRow!.total_tokens).toBe(1500)
  })

  it('데이터가 없으면 빈 배열을 반환한다', () => {
    const result = getHeartbeatData('all', 5)
    expect(result).toEqual([])
  })

  it('minutes 파라미터 범위 밖 데이터는 포함하지 않는다', () => {
    const oldTs = new Date(Date.now() - 10 * 60_000).toISOString()

    insertApiRequest(testDb, {
      agent_type: 'claude',
      input_tokens: 1000,
      output_tokens: 500,
      timestamp: oldTs,
    })

    const result = getHeartbeatData('all', 5)
    expect(result).toEqual([])
  })

  it('agent_type 필터가 적용된다', () => {
    const ts = new Date(Date.now() - 60_000).toISOString()

    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 1000, output_tokens: 500, timestamp: ts })
    insertApiRequest(testDb, { agent_type: 'codex', input_tokens: 200, output_tokens: 100, timestamp: ts })

    const result = getHeartbeatData('claude', 5)

    expect(result.every((r) => r.agent_type === 'claude')).toBe(true)
    expect(result.find((r) => r.agent_type === 'codex')).toBeUndefined()
  })

  it('같은 minute 내 데이터는 합산된다', () => {
    const ts = new Date(Date.now() - 60_000).toISOString()

    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 100, output_tokens: 50, timestamp: ts })
    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 200, output_tokens: 100, timestamp: ts })

    const result = getHeartbeatData('claude', 5)

    const claudeRow = result.find((r) => r.agent_type === 'claude')
    expect(claudeRow).toBeDefined()
    expect(claudeRow!.total_tokens).toBe(450)
  })

  it('결과는 minute 오름차순으로 정렬된다', () => {
    const ts1 = new Date(Date.now() - 3 * 60_000).toISOString()
    const ts2 = new Date(Date.now() - 60_000).toISOString()

    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 100, output_tokens: 50, timestamp: ts2 })
    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 200, output_tokens: 100, timestamp: ts1 })

    const result = getHeartbeatData('claude', 5)

    if (result.length >= 2) {
      expect(result[0].minute <= result[result.length - 1].minute).toBe(true)
    }
  })

  it('HeartbeatPoint 형태로 반환된다', () => {
    const ts = new Date(Date.now() - 60_000).toISOString()
    insertApiRequest(testDb, { agent_type: 'claude', input_tokens: 100, output_tokens: 50, timestamp: ts })

    const result = getHeartbeatData('all', 5)

    expect(result.length).toBeGreaterThan(0)
    const point = result[0]
    expect(typeof point.minute).toBe('string')
    expect(typeof point.agent_type).toBe('string')
    expect(typeof point.total_tokens).toBe('number')
  })
})
