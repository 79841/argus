import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/setup', () => ({
  connectAgents: vi.fn(() => [{ agent: 'claude', success: true, action: 'connected' }]),
}))

const { POST } = await import('../route')

const mkRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/setup/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/setup/connect', () => {
  it('유효하지 않은 JSON이면 400을 반환한다', async () => {
    const req = new NextRequest('http://localhost/api/setup/connect', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('agents 배열이 없으면 400을 반환한다', async () => {
    const res = await POST(mkRequest({}) as never)
    expect(res.status).toBe(400)
  })

  it('빈 agents 배열이면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ agents: [] }) as never)
    expect(res.status).toBe(400)
  })

  it('유효한 agents로 요청하면 200과 results를 반환한다', async () => {
    const res = await POST(mkRequest({ agents: ['claude'] }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toBeDefined()
  })

  it('agents가 배열이 아니면 400을 반환한다', async () => {
    const res = await POST(mkRequest({ agents: 'claude' }) as never)
    expect(res.status).toBe(400)
  })
})
