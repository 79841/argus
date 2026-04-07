import { describe, it, expect, beforeEach, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertApiRequest, insertToolDetail } from '../../__tests__/test-helpers'

let db: Database.Database

vi.mock('@/shared/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/db')>()
  return {
    ...original,
    getDb: () => db,
  }
})

import { getActiveAgentSessions, getSessionAgentBlocks } from '../agents'

describe('getActiveAgentSessions', () => {
  beforeEach(() => {
    db = createTestDb()
  })

  it('returns sessions with recent activity', () => {
    const now = new Date().toISOString()
    insertApiRequest(db, { timestamp: now, session_id: 'sess-1', project_name: 'argus' })
    insertApiRequest(db, { timestamp: now, session_id: 'sess-2', project_name: 'travel' })

    const result = getActiveAgentSessions()
    expect(result).toHaveLength(2)
    expect(result[0].project_name).toBe('argus')
  })

  it('excludes sessions older than 5 minutes', () => {
    const old = '2020-01-01 00:00:00'
    const recent = new Date().toISOString()
    insertApiRequest(db, { timestamp: old, session_id: 'old-sess' })
    insertApiRequest(db, { timestamp: recent, session_id: 'new-sess' })

    const result = getActiveAgentSessions()
    expect(result).toHaveLength(1)
    expect(result[0].session_id).toBe('new-sess')
  })

  it('returns empty array when no active sessions', () => {
    const result = getActiveAgentSessions()
    expect(result).toEqual([])
  })

  it('includes first_event and last_event', () => {
    const t1 = new Date(Date.now() - 2000).toISOString()
    const t2 = new Date().toISOString()
    insertApiRequest(db, { timestamp: t1, session_id: 'sess-1' })
    insertApiRequest(db, { timestamp: t2, session_id: 'sess-1' })

    const result = getActiveAgentSessions()
    expect(result).toHaveLength(1)
    expect(result[0].first_event).toBe(t1)
    expect(result[0].last_event).toBe(t2)
  })
})

describe('getSessionAgentBlocks', () => {
  beforeEach(() => {
    db = createTestDb()
  })

  it('returns agent blocks for given session ids', () => {
    insertToolDetail(db, {
      session_id: 'sess-1',
      tool_name: 'Agent',
      detail_name: 'Explore',
      detail_type: 'agent',
      duration_ms: 3200,
      success: 1,
    })
    insertToolDetail(db, {
      session_id: 'sess-1',
      tool_name: 'Agent',
      detail_name: 'page-builder',
      detail_type: 'agent',
      duration_ms: 12400,
      success: 1,
    })

    const result = getSessionAgentBlocks(['sess-1'])
    expect(result).toHaveLength(2)
    expect(result[0].detail_name).toBe('Explore')
    expect(result[1].detail_name).toBe('page-builder')
  })

  it('filters by detail_type agent only', () => {
    insertToolDetail(db, {
      session_id: 'sess-1',
      detail_name: 'Explore',
      detail_type: 'agent',
    })
    insertToolDetail(db, {
      session_id: 'sess-1',
      detail_name: 'some-skill',
      detail_type: 'skill',
    })

    const result = getSessionAgentBlocks(['sess-1'])
    expect(result).toHaveLength(1)
    expect(result[0].detail_name).toBe('Explore')
  })

  it('returns running status when success is null', () => {
    insertToolDetail(db, {
      session_id: 'sess-1',
      detail_name: 'Explore',
      detail_type: 'agent',
      success: undefined as unknown as number,
    })

    const result = getSessionAgentBlocks(['sess-1'])
    expect(result).toHaveLength(1)
  })

  it('returns empty array for empty session ids', () => {
    const result = getSessionAgentBlocks([])
    expect(result).toEqual([])
  })

  it('returns blocks only for specified sessions', () => {
    insertToolDetail(db, { session_id: 'sess-1', detail_name: 'Explore', detail_type: 'agent' })
    insertToolDetail(db, { session_id: 'sess-2', detail_name: 'plan-writer', detail_type: 'agent' })

    const result = getSessionAgentBlocks(['sess-1'])
    expect(result).toHaveLength(1)
    expect(result[0].detail_name).toBe('Explore')
  })
})
