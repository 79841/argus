import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ToolSingleStat, ToolDailyRow, ToolSessionRow } from '@/shared/lib/queries'

vi.mock('@/shared/lib/queries', () => ({
  getToolSingleStat: vi.fn(),
  getToolDailyStats: vi.fn(),
  getToolRelatedSessions: vi.fn(),
}))

vi.mock('@/shared/lib/api-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-utils')>()
  return {
    ...actual,
    parseDays: vi.fn((v: string | null, def: number) => (v ? parseInt(v) : def)),
  }
})

import * as queries from '@/shared/lib/queries'

const { GET } = await import('../route')

const mkRequest = (url: string): NextRequest => new NextRequest(url)

const mkParams = (name: string) => Promise.resolve({ name })

const mockTool: ToolSingleStat = {
  tool_name: 'Bash',
  invocation_count: 10,
  success_count: 9,
  fail_count: 1,
  avg_duration_ms: 300,
  total_cost: 0.005,
  last_used: '2026-03-25T10:00:00.000Z',
}

const mockDaily: ToolDailyRow[] = [
  { date: '2026-03-25', count: 5, success_count: 5, fail_count: 0, avg_duration_ms: 300 },
]

const mockSessions: ToolSessionRow[] = [
  { session_id: 'sess-1', project_name: 'argus', agent_type: 'claude', call_count: 3, success_count: 3, date: '2026-03-25' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/tools/[name]', () => {
  it('도구 통계, 일별 데이터, 세션 목록을 반환한다', async () => {
    vi.mocked(queries.getToolSingleStat).mockReturnValue(mockTool)
    vi.mocked(queries.getToolDailyStats).mockReturnValue(mockDaily)
    vi.mocked(queries.getToolRelatedSessions).mockReturnValue(mockSessions)

    const res = await GET(mkRequest('http://localhost:9845/api/tools/Bash'), { params: mkParams('Bash') })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('tool')
    expect(json).toHaveProperty('daily')
    expect(json).toHaveProperty('sessions')
    expect(json.tool).toEqual(mockTool)
    expect(json.daily).toEqual(mockDaily)
    expect(json.sessions).toEqual(mockSessions)
  })

  it('URL 인코딩된 도구 이름을 디코딩해서 쿼리를 호출한다', async () => {
    vi.mocked(queries.getToolSingleStat).mockReturnValue(null)
    vi.mocked(queries.getToolDailyStats).mockReturnValue([])
    vi.mocked(queries.getToolRelatedSessions).mockReturnValue([])

    await GET(
      mkRequest('http://localhost:9845/api/tools/mcp%3Alinear'),
      { params: mkParams('mcp%3Alinear') },
    )

    expect(queries.getToolSingleStat).toHaveBeenCalledWith('mcp:linear', expect.any(Number))
  })

  it('도구가 없으면 tool: null을 반환한다', async () => {
    vi.mocked(queries.getToolSingleStat).mockReturnValue(null)
    vi.mocked(queries.getToolDailyStats).mockReturnValue([])
    vi.mocked(queries.getToolRelatedSessions).mockReturnValue([])

    const res = await GET(
      mkRequest('http://localhost:9845/api/tools/NonExistent'),
      { params: mkParams('NonExistent') },
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.tool).toBeNull()
    expect(json.daily).toEqual([])
    expect(json.sessions).toEqual([])
  })

  it('쿼리 함수가 에러를 던지면 500 응답을 반환한다', async () => {
    vi.mocked(queries.getToolSingleStat).mockImplementation(() => {
      throw new Error('DB error')
    })

    const res = await GET(
      mkRequest('http://localhost:9845/api/tools/Bash'),
      { params: mkParams('Bash') },
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('days 파라미터를 쿼리에 전달한다', async () => {
    vi.mocked(queries.getToolSingleStat).mockReturnValue(mockTool)
    vi.mocked(queries.getToolDailyStats).mockReturnValue([])
    vi.mocked(queries.getToolRelatedSessions).mockReturnValue([])

    await GET(
      mkRequest('http://localhost:9845/api/tools/Bash?days=30'),
      { params: mkParams('Bash') },
    )

    expect(queries.getToolSingleStat).toHaveBeenCalledWith('Bash', 30)
    expect(queries.getToolDailyStats).toHaveBeenCalledWith('Bash', 30)
    expect(queries.getToolRelatedSessions).toHaveBeenCalledWith('Bash', 30, 20)
  })
})
