import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getConfigHistory } from '@/shared/lib/config-tracker'

vi.mock('@/shared/lib/config-tracker', () => ({
  getConfigHistory: vi.fn().mockResolvedValue({ commits: [], files: [] }),
}))

const { GET } = await import('../route')

const mkRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/config-history')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString())
}

beforeEach(() => {
  vi.mocked(getConfigHistory).mockClear()
  vi.mocked(getConfigHistory).mockResolvedValue({ commits: [], files: [] } as never)
})

describe('GET /api/config-history', () => {
  it('days 파라미터 없으면 기본값 30을 사용한다', async () => {
    const res = await GET(mkRequest() as never)
    expect(res.status).toBe(200)
    expect(getConfigHistory).toHaveBeenCalledWith(expect.any(String), 30)
  })

  it('days=7이면 7을 사용한다', async () => {
    await GET(mkRequest({ days: '7' }) as never)
    expect(getConfigHistory).toHaveBeenCalledWith(expect.any(String), 7)
  })

  it('days=0이면 최소값 1로 처리한다', async () => {
    await GET(mkRequest({ days: '0' }) as never)
    const calls = vi.mocked(getConfigHistory).mock.calls
    expect(calls[0][1]).toBeGreaterThanOrEqual(1)
  })

  it('days가 음수이면 최소값 1로 처리한다', async () => {
    await GET(mkRequest({ days: '-5' }) as never)
    const calls = vi.mocked(getConfigHistory).mock.calls
    expect(calls[0][1]).toBeGreaterThanOrEqual(1)
  })

  it('days가 숫자가 아니면 기본값 30을 사용한다', async () => {
    await GET(mkRequest({ days: 'abc' }) as never)
    const calls = vi.mocked(getConfigHistory).mock.calls
    expect(calls[0][1]).toBe(30)
  })
})
