import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/queries', () => ({
  getOverviewStats: vi.fn(),
  getAllTimeStats: vi.fn(),
  getOverviewDelta: vi.fn(),
  getAgentTodaySummaries: vi.fn(),
}))

const { GET } = await import('../route')
import { getOverviewStats, getAllTimeStats, getOverviewDelta, getAgentTodaySummaries } from '@/shared/lib/queries'

const mkRequest = (params: Record<string, string> = {}): NextRequest => {
  const url = new URL('http://localhost:9845/api/overview')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const mockOverviewStats = {
  today_cost: 1.23,
  today_sessions: 5,
  today_tokens: 10000,
}

const mockAllTimeStats = {
  total_cost: 100.0,
  total_tokens: 1000000,
}

const mockDelta = {
  cost_delta: 0.5,
  session_delta: 2,
}

const mockAgentSummaries = [
  { agent_type: 'claude', session_count: 3, cost_usd: 0.9 },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getOverviewStats).mockResolvedValue(mockOverviewStats)
  vi.mocked(getAllTimeStats).mockResolvedValue(mockAllTimeStats)
  vi.mocked(getOverviewDelta).mockResolvedValue(mockDelta)
  vi.mocked(getAgentTodaySummaries).mockResolvedValue(mockAgentSummaries)
})

describe('GET /api/overview', () => {
  it('200과 JSON을 반환한다', async () => {
    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toBeDefined()
  })

  it('응답에 all_time_cost, all_time_tokens, delta, agent_summaries가 포함된다', async () => {
    const res = await GET(mkRequest())
    const json = await res.json()
    expect(json.all_time_cost).toBe(100.0)
    expect(json.all_time_tokens).toBe(1000000)
    expect(json.delta).toEqual(mockDelta)
    expect(json.agent_summaries).toEqual(mockAgentSummaries)
  })

  it('overview stats가 응답에 병합된다', async () => {
    const res = await GET(mkRequest())
    const json = await res.json()
    expect(json.today_cost).toBe(1.23)
    expect(json.today_sessions).toBe(5)
    expect(json.today_tokens).toBe(10000)
  })

  it('?agent_type=claude → getOverviewStats에 "claude" 전달', async () => {
    await GET(mkRequest({ agent_type: 'claude' }))
    expect(getOverviewStats).toHaveBeenCalledWith('claude', 'all', undefined, undefined)
    expect(getAllTimeStats).toHaveBeenCalledWith('claude', 'all')
    expect(getOverviewDelta).toHaveBeenCalledWith('claude', 'all')
  })

  it('?agent_type=codex → getOverviewStats에 "codex" 전달', async () => {
    await GET(mkRequest({ agent_type: 'codex' }))
    expect(getOverviewStats).toHaveBeenCalledWith('codex', 'all', undefined, undefined)
  })

  it('?agent_type=invalid → parseAgentType에 의해 "all"로 폴백', async () => {
    await GET(mkRequest({ agent_type: 'invalid' }))
    expect(getOverviewStats).toHaveBeenCalledWith('all', 'all', undefined, undefined)
  })

  it('?project=argus → getOverviewStats에 "argus" 전달', async () => {
    await GET(mkRequest({ project: 'argus' }))
    expect(getOverviewStats).toHaveBeenCalledWith('all', 'argus', undefined, undefined)
  })

  it('?from=2024-01-01&to=2024-01-31 → 날짜 파라미터 전달', async () => {
    await GET(mkRequest({ from: '2024-01-01', to: '2024-01-31' }))
    expect(getOverviewStats).toHaveBeenCalledWith('all', 'all', '2024-01-01', '2024-01-31')
  })

  it('agent_type 없으면 "all"을 기본값으로 사용한다', async () => {
    await GET(mkRequest())
    expect(getOverviewStats).toHaveBeenCalledWith('all', 'all', undefined, undefined)
  })

  it('쿼리 함수 에러 시 500을 반환한다', async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(new Error('DB error'))
    const res = await GET(mkRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
