import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/queries', () => ({
  getDailyStats: vi.fn(),
}))

const { GET } = await import('../route')
import { getDailyStats } from '@/shared/lib/queries'

const mkRequest = (params: Record<string, string> = {}): NextRequest => {
  const url = new URL('http://localhost:9845/api/daily')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const mockDailyStats = [
  {
    date: '2024-01-15',
    sessions: 8,
    cost: 1.5,
    input_tokens: 15000,
    output_tokens: 6000,
    cache_read_tokens: 0,
    agent_type: 'claude',
  },
  {
    date: '2024-01-14',
    sessions: 4,
    cost: 0.8,
    input_tokens: 8000,
    output_tokens: 3000,
    cache_read_tokens: 0,
    agent_type: 'claude',
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getDailyStats).mockResolvedValue(mockDailyStats)
})

describe('GET /api/daily', () => {
  it('200과 DailyStats[] JSON을 반환한다', async () => {
    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json).toEqual(mockDailyStats)
  })

  it('파라미터 없이 호출 시 기본값(all, 30, all, undefined, undefined) 전달', async () => {
    await GET(mkRequest())
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?days=30&agent_type=all → 파라미터 전달', async () => {
    await GET(mkRequest({ days: '30', agent_type: 'all' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?days=7 → days=7 전달', async () => {
    await GET(mkRequest({ days: '7' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 7, 'all', undefined, undefined)
  })

  it('?agent_type=claude → getDailyStats에 "claude" 전달', async () => {
    await GET(mkRequest({ agent_type: 'claude' }))
    expect(getDailyStats).toHaveBeenCalledWith('claude', 30, 'all', undefined, undefined)
  })

  it('?agent_type=codex → getDailyStats에 "codex" 전달', async () => {
    await GET(mkRequest({ agent_type: 'codex' }))
    expect(getDailyStats).toHaveBeenCalledWith('codex', 30, 'all', undefined, undefined)
  })

  it('?agent_type=gemini → getDailyStats에 "gemini" 전달', async () => {
    await GET(mkRequest({ agent_type: 'gemini' }))
    expect(getDailyStats).toHaveBeenCalledWith('gemini', 30, 'all', undefined, undefined)
  })

  it('?agent_type=invalid → "all"로 폴백', async () => {
    await GET(mkRequest({ agent_type: 'invalid' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?days=invalid → 기본값 30 사용', async () => {
    await GET(mkRequest({ days: 'abc' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?days=0 → 기본값 30 사용', async () => {
    await GET(mkRequest({ days: '0' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?days=366 → 기본값 30 사용 (범위 초과)', async () => {
    await GET(mkRequest({ days: '366' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', undefined, undefined)
  })

  it('?project=argus → getDailyStats에 "argus" 전달', async () => {
    await GET(mkRequest({ project: 'argus' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'argus', undefined, undefined)
  })

  it('?from=2024-01-01&to=2024-01-31 → 날짜 파라미터 전달', async () => {
    await GET(mkRequest({ from: '2024-01-01', to: '2024-01-31' }))
    expect(getDailyStats).toHaveBeenCalledWith('all', 30, 'all', '2024-01-01', '2024-01-31')
  })

  it('쿼리 함수 에러 시 500을 반환한다', async () => {
    vi.mocked(getDailyStats).mockRejectedValue(new Error('DB error'))
    const res = await GET(mkRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
