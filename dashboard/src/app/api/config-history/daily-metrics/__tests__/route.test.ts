import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/queries', () => ({
  getDailyMetrics: vi.fn().mockReturnValue([]),
}))

const { GET } = await import('../route')
import { getDailyMetrics } from '@/shared/lib/queries'

const mkRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/config-history/daily-metrics')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString())
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/config-history/daily-metrics', () => {
  it('from과 to가 모두 있으면 200을 반환한다', async () => {
    const res = await GET(mkRequest({ from: '2026-01-01', to: '2026-03-01' }) as never)
    expect(res.status).toBe(200)
    expect(getDailyMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'all', 'all')
  })

  it('from이 없으면 400을 반환한다', async () => {
    const res = await GET(mkRequest({ to: '2026-03-01' }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/from/)
  })

  it('to가 없으면 400을 반환한다', async () => {
    const res = await GET(mkRequest({ from: '2026-01-01' }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/to/)
  })

  it('from 날짜 포맷이 잘못되면 400을 반환한다', async () => {
    const res = await GET(mkRequest({ from: '2026/01/01', to: '2026-03-01' }) as never)
    expect(res.status).toBe(400)
  })

  it('to 날짜 포맷이 잘못되면 400을 반환한다', async () => {
    const res = await GET(mkRequest({ from: '2026-01-01', to: 'not-a-date' }) as never)
    expect(res.status).toBe(400)
  })

  it('agent_type이 유효하지 않으면 all로 폴백한다', async () => {
    await GET(mkRequest({ from: '2026-01-01', to: '2026-03-01', agent_type: 'invalid' }) as never)
    expect(getDailyMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'all', 'all')
  })

  it('agent_type=claude이면 그대로 전달한다', async () => {
    await GET(mkRequest({ from: '2026-01-01', to: '2026-03-01', agent_type: 'claude' }) as never)
    expect(getDailyMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'claude', 'all')
  })

  it('project 파라미터를 전달한다', async () => {
    await GET(mkRequest({ from: '2026-01-01', to: '2026-03-01', project: 'argus' }) as never)
    expect(getDailyMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'all', 'argus')
  })

  it('project가 200자 초과이면 all로 폴백한다', async () => {
    const longProject = 'p'.repeat(201)
    await GET(mkRequest({ from: '2026-01-01', to: '2026-03-01', project: longProject }) as never)
    expect(getDailyMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-01', 'all', 'all')
  })
})
