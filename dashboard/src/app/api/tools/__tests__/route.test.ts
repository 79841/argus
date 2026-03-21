import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ToolUsageRow, ToolDetailRow, DailyToolRow, IndividualToolRow } from '@/shared/lib/queries'

vi.mock('@/shared/lib/queries', () => ({
  getToolUsageStats: vi.fn(),
  getToolDetailStats: vi.fn(),
  getDailyToolStats: vi.fn(),
  getIndividualToolStats: vi.fn(),
}))

vi.mock('@/shared/lib/api-utils', () => ({
  parseAgentType: vi.fn((v: string | null) => v || 'all'),
  parseDays: vi.fn((v: string | null, def: number) => (v ? parseInt(v) : def)),
}))

import * as queries from '@/shared/lib/queries'
import * as apiUtils from '@/shared/lib/api-utils'

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

const mockTools: ToolUsageRow[] = [
  { tool_name: 'Bash', invocation_count: 10, success_count: 9, fail_count: 1, avg_duration_ms: 500 },
  { tool_name: 'Read', invocation_count: 5, success_count: 5, fail_count: 0, avg_duration_ms: 100 },
]

const mockDetailTools: ToolDetailRow[] = [
  {
    tool_name: 'Bash',
    category: 'builtin',
    invocation_count: 10,
    success_count: 9,
    fail_count: 1,
    avg_duration_ms: 500,
    total_duration_ms: 5000,
    prompt_count: 3,
    total_tokens: 1000,
    total_cost: 0.01,
  },
]

const mockDailyTools: DailyToolRow[] = [
  { date: '2026-03-20', tool_name: 'Bash', count: 5 },
]

const mockIndividualTools: IndividualToolRow[] = []

describe('GET /api/tools', () => {
  it('기본 GET 요청 → 200 + { tools: ToolUsageRow[] }', async () => {
    vi.mocked(queries.getToolUsageStats).mockResolvedValue(mockTools)

    const res = await GET(mkRequest('http://localhost:9845/api/tools'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('tools')
    expect(json.tools).toEqual(mockTools)
  })

  it('getToolUsageStats 호출 시 파라미터가 전달됨', async () => {
    vi.mocked(queries.getToolUsageStats).mockResolvedValue([])

    await GET(mkRequest('http://localhost:9845/api/tools?agent_type=claude&days=14'))

    expect(queries.getToolUsageStats).toHaveBeenCalledOnce()
  })

  it('?detail=true → getToolDetailStats, getDailyToolStats, getIndividualToolStats 호출', async () => {
    vi.mocked(queries.getToolDetailStats).mockResolvedValue(mockDetailTools)
    vi.mocked(queries.getDailyToolStats).mockResolvedValue(mockDailyTools)
    vi.mocked(queries.getIndividualToolStats).mockResolvedValue(mockIndividualTools)

    const res = await GET(mkRequest('http://localhost:9845/api/tools?detail=true'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('tools')
    expect(json).toHaveProperty('daily')
    expect(json).toHaveProperty('individual')
    expect(queries.getToolDetailStats).toHaveBeenCalledOnce()
    expect(queries.getDailyToolStats).toHaveBeenCalledOnce()
    expect(queries.getIndividualToolStats).toHaveBeenCalledOnce()
    // detail=true일 때 getToolUsageStats는 호출되지 않음
    expect(queries.getToolUsageStats).not.toHaveBeenCalled()
  })

  it('?detail=true → 응답에 tools, daily, individual 포함', async () => {
    vi.mocked(queries.getToolDetailStats).mockResolvedValue(mockDetailTools)
    vi.mocked(queries.getDailyToolStats).mockResolvedValue(mockDailyTools)
    vi.mocked(queries.getIndividualToolStats).mockResolvedValue(mockIndividualTools)

    const res = await GET(mkRequest('http://localhost:9845/api/tools?detail=true'))
    const json = await res.json()

    expect(json.tools).toEqual(mockDetailTools)
    expect(json.daily).toEqual(mockDailyTools)
    expect(json.individual).toEqual(mockIndividualTools)
  })

  it('쿼리 함수가 에러를 던지면 → 500 응답', async () => {
    vi.mocked(queries.getToolUsageStats).mockRejectedValue(new Error('DB error'))

    const res = await GET(mkRequest('http://localhost:9845/api/tools'))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toHaveProperty('error')
  })
})
