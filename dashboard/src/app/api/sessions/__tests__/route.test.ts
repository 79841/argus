import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/queries', () => ({
  getSessions: vi.fn(),
}))

const { GET } = await import('../route')
import { getSessions } from '@/shared/lib/queries'

const mkRequest = (params: Record<string, string> = {}): NextRequest => {
  const url = new URL('http://localhost:9845/api/sessions')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const mockSessions = [
  {
    session_id: 'sess-1',
    agent_type: 'claude',
    model: 'claude-sonnet-4-6',
    started_at: '2024-01-15T10:00:00Z',
    request_count: 10,
    total_cost: 0.5,
    total_input_tokens: 5000,
    total_output_tokens: 2000,
  },
  {
    session_id: 'sess-2',
    agent_type: 'codex',
    model: 'gpt-4.1',
    started_at: '2024-01-15T11:00:00Z',
    request_count: 5,
    total_cost: 0.2,
    total_input_tokens: 2000,
    total_output_tokens: 800,
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getSessions).mockResolvedValue(mockSessions)
})

describe('GET /api/sessions', () => {
  it('200과 SessionRow[] JSON을 반환한다', async () => {
    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json).toEqual(mockSessions)
  })

  it('파라미터 없이 호출 시 기본값(all, all, undefined, undefined, 100) 전달', async () => {
    await GET(mkRequest())
    expect(getSessions).toHaveBeenCalledWith('all', 'all', undefined, undefined, 100)
  })

  it('?agent_type=codex → getSessions에 "codex" 전달', async () => {
    await GET(mkRequest({ agent_type: 'codex' }))
    expect(getSessions).toHaveBeenCalledWith('codex', 'all', undefined, undefined, 100)
  })

  it('?agent_type=claude&limit=10 → 파라미터 전달', async () => {
    await GET(mkRequest({ agent_type: 'claude', limit: '10' }))
    expect(getSessions).toHaveBeenCalledWith('claude', 'all', undefined, undefined, 10)
  })

  it('?agent_type=gemini → getSessions에 "gemini" 전달', async () => {
    await GET(mkRequest({ agent_type: 'gemini' }))
    expect(getSessions).toHaveBeenCalledWith('gemini', 'all', undefined, undefined, 100)
  })

  it('?agent_type=invalid → "all"로 폴백', async () => {
    await GET(mkRequest({ agent_type: 'invalid' }))
    expect(getSessions).toHaveBeenCalledWith('all', 'all', undefined, undefined, 100)
  })

  it('?project=argus → getSessions에 "argus" 전달', async () => {
    await GET(mkRequest({ project: 'argus' }))
    expect(getSessions).toHaveBeenCalledWith('all', 'argus', undefined, undefined, 100)
  })

  it('?limit=50 → limit 50 전달', async () => {
    await GET(mkRequest({ limit: '50' }))
    expect(getSessions).toHaveBeenCalledWith('all', 'all', undefined, undefined, 50)
  })

  it('?limit=invalid → 기본값 100 사용', async () => {
    await GET(mkRequest({ limit: 'invalid' }))
    expect(getSessions).toHaveBeenCalledWith('all', 'all', undefined, undefined, 100)
  })

  it('?from=2024-01-01&to=2024-01-31 → 날짜 파라미터 전달', async () => {
    await GET(mkRequest({ from: '2024-01-01', to: '2024-01-31' }))
    expect(getSessions).toHaveBeenCalledWith('all', 'all', '2024-01-01', '2024-01-31', 100)
  })

  it('쿼리 함수 에러 시 500을 반환한다', async () => {
    vi.mocked(getSessions).mockRejectedValue(new Error('DB error'))
    const res = await GET(mkRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
