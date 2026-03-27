import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { NextRequest } from 'next/server'
import { initSchema } from '@/shared/lib/db'

let testDb: Database.Database

vi.mock('@/shared/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/db')>()
  return { ...original, getDb: () => testDb }
})

const { POST } = await import('../route')

const mkRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/ingest/tool-detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

describe('POST /api/ingest/tool-detail', () => {
  it('유효하지 않은 JSON이면 400을 반환한다', async () => {
    const req = new NextRequest('http://localhost/api/ingest/tool-detail', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('session_id가 없으면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ tool_name: 'bash' }) as never)
    expect(res.status).toBe(400)
  })

  it('session_id가 빈 문자열이면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ session_id: '', tool_name: 'bash' }) as never)
    expect(res.status).toBe(400)
  })

  it('tool_name이 없으면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ session_id: 'sess-1' }) as never)
    expect(res.status).toBe(400)
  })

  it('tool_name이 빈 문자열이면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ session_id: 'sess-1', tool_name: '' }) as never)
    expect(res.status).toBe(400)
  })

  it('session_id가 공백만이면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ session_id: '   ', tool_name: 'bash' }) as never)
    expect(res.status).toBe(400)
  })

  it('필수 필드가 있으면 DB에 저장하고 accepted: 1을 반환한다', async () => {
    const res = await POST(mkRequest({ session_id: 'sess-1', tool_name: 'bash' }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.accepted).toBe(1)

    const rows = testDb.prepare('SELECT * FROM tool_details').all() as Array<{ session_id: string; tool_name: string }>
    expect(rows).toHaveLength(1)
    expect(rows[0].session_id).toBe('sess-1')
    expect(rows[0].tool_name).toBe('bash')
  })

  it('메타데이터와 함께 저장한다', async () => {
    const payload = {
      session_id: 'sess-2',
      tool_name: 'mcp:github',
      detail_name: 'create_issue',
      detail_type: 'mcp',
      duration_ms: 200,
      success: true,
      project_name: 'argus',
      agent_type: 'claude',
      metadata: { key: 'value' },
    }
    const res = await POST(mkRequest(payload) as never)
    expect(res.status).toBe(200)

    const row = testDb.prepare('SELECT * FROM tool_details WHERE session_id = ?').get('sess-2') as {
      tool_name: string; detail_name: string; detail_type: string; metadata: string
    }
    expect(row.tool_name).toBe('mcp:github')
    expect(row.detail_name).toBe('create_issue')
    expect(row.detail_type).toBe('mcp')
    expect(JSON.parse(row.metadata)).toEqual({ key: 'value' })
  })
})
