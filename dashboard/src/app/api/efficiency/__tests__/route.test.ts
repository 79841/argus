import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { EfficiencyRow, EfficiencyComparisonRow } from '@/lib/queries'

vi.mock('@/lib/queries', () => ({
  getEfficiencyStats: vi.fn(),
  getEfficiencyComparison: vi.fn(),
}))

vi.mock('@/lib/api-utils', () => ({
  parseDays: vi.fn((v: string | null, def: number) => (v ? parseInt(v) : def)),
}))

import * as queries from '@/lib/queries'

const { GET } = await import('../route')

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const mkRequest = (url: string): NextRequest => {
  return new NextRequest(url)
}

const mockData: EfficiencyRow[] = [
  {
    agent_type: 'claude',
    date: '2026-03-20',
    total_input: 10000,
    total_output: 3000,
    total_requests: 5,
    total_cache_read: 2000,
    cache_hit_rate: 0.2,
    cost: 0.05,
    total_duration_ms: 15000,
  },
]

const mockComparison: EfficiencyComparisonRow[] = [
  {
    agent_type: 'claude',
    total_input: 50000,
    total_output: 15000,
    total_requests: 25,
    total_cache_read: 10000,
    cost: 0.25,
    total_duration_ms: 75000,
  },
]

describe('GET /api/efficiency', () => {
  it('기본 GET 요청 → 200 + { data, comparison }', async () => {
    vi.mocked(queries.getEfficiencyStats).mockReturnValue(mockData)
    vi.mocked(queries.getEfficiencyComparison).mockReturnValue(mockComparison)

    const res = await GET(mkRequest('http://localhost:9845/api/efficiency'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('comparison')
    expect(json.data).toEqual(mockData)
    expect(json.comparison).toEqual(mockComparison)
  })

  it('?days=7 → days=7이 쿼리 함수에 전달됨', async () => {
    vi.mocked(queries.getEfficiencyStats).mockReturnValue([])
    vi.mocked(queries.getEfficiencyComparison).mockReturnValue([])

    await GET(mkRequest('http://localhost:9845/api/efficiency?days=7'))

    expect(queries.getEfficiencyStats).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(queries.getEfficiencyStats).mock.calls[0]
    expect(callArgs[0]).toBe(7)
  })

  it('?days=30 → days=30이 쿼리 함수에 전달됨', async () => {
    vi.mocked(queries.getEfficiencyStats).mockReturnValue([])
    vi.mocked(queries.getEfficiencyComparison).mockReturnValue([])

    await GET(mkRequest('http://localhost:9845/api/efficiency?days=30'))

    expect(queries.getEfficiencyStats).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(queries.getEfficiencyStats).mock.calls[0]
    expect(callArgs[0]).toBe(30)
  })

  it('days 파라미터 없으면 기본값 7 사용', async () => {
    vi.mocked(queries.getEfficiencyStats).mockReturnValue([])
    vi.mocked(queries.getEfficiencyComparison).mockReturnValue([])

    await GET(mkRequest('http://localhost:9845/api/efficiency'))

    expect(queries.getEfficiencyStats).toHaveBeenCalledOnce()
    const callArgs = vi.mocked(queries.getEfficiencyStats).mock.calls[0]
    expect(callArgs[0]).toBe(7)
  })

  it('getEfficiencyStats, getEfficiencyComparison 모두 호출됨', async () => {
    vi.mocked(queries.getEfficiencyStats).mockReturnValue(mockData)
    vi.mocked(queries.getEfficiencyComparison).mockReturnValue(mockComparison)

    await GET(mkRequest('http://localhost:9845/api/efficiency'))

    expect(queries.getEfficiencyStats).toHaveBeenCalledOnce()
    expect(queries.getEfficiencyComparison).toHaveBeenCalledOnce()
  })

  it('쿼리 함수가 에러를 던지면 → 500 응답', async () => {
    vi.mocked(queries.getEfficiencyStats).mockImplementation(() => {
      throw new Error('DB error')
    })

    const res = await GET(mkRequest('http://localhost:9845/api/efficiency'))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toHaveProperty('error')
  })
})
