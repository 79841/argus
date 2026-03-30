import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/shared/lib/queries/impact', () => ({
  getImpactCompare: vi.fn().mockReturnValue({}),
  getImpactCompareBatch: vi.fn().mockReturnValue([]),
}))

vi.mock('@/shared/lib/queries', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/queries')>()
  const { getImpactCompare, getImpactCompareBatch } = await import('@/shared/lib/queries/impact')
  return { ...original, getImpactCompare, getImpactCompareBatch }
})

const { GET } = await import('../route')

const mkRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/config-history/compare')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString())
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/config-history/compare', () => {
  it('date 또는 dates 파라미터가 없으면 400을 반환한다', async () => {
    const res = await GET(mkRequest() as never)
    expect(res.status).toBe(400)
  })

  it('date 파라미터가 있으면 getImpactCompare를 호출한다', async () => {
    const { getImpactCompare } = await import('@/shared/lib/queries/impact')
    vi.mocked(getImpactCompare).mockClear()
    const res = await GET(mkRequest({ date: '2026-03-01' }) as never)
    expect(res.status).toBe(200)
    expect(getImpactCompare).toHaveBeenCalledWith('2026-03-01', expect.any(Number), expect.any(String), expect.any(String))
  })

  it('dates 파라미터가 있으면 getImpactCompareBatch를 호출한다', async () => {
    const { getImpactCompareBatch } = await import('@/shared/lib/queries/impact')
    vi.mocked(getImpactCompareBatch).mockClear()
    const dates = '2026-03-01,2026-03-02,2026-03-03'
    const res = await GET(mkRequest({ dates }) as never)
    expect(res.status).toBe(200)
    expect(getImpactCompareBatch).toHaveBeenCalledWith(
      ['2026-03-01', '2026-03-02', '2026-03-03'],
      expect.any(Number),
      expect.any(String),
      expect.any(String),
    )
  })

  it('dates가 30개를 초과하면 30개로 잘라서 처리한다', async () => {
    const { getImpactCompareBatch } = await import('@/shared/lib/queries/impact')
    vi.mocked(getImpactCompareBatch).mockClear()
    const manyDates = Array.from({ length: 50 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`).join(',')
    await GET(mkRequest({ dates: manyDates }) as never)
    const calls = vi.mocked(getImpactCompareBatch).mock.calls
    expect(calls[0][0]).toHaveLength(30)
  })

  it('date 포맷이 잘못되면(YYYY/MM/DD) 400을 반환한다', async () => {
    const res = await GET(mkRequest({ date: '2026/03/01' }) as never)
    expect(res.status).toBe(400)
  })

  it('date가 ISO 형식이 아닌 문자열이면 400을 반환한다', async () => {
    const res = await GET(mkRequest({ date: 'not-a-date' }) as never)
    expect(res.status).toBe(400)
  })

  it('days가 범위를 초과하면 기본값 7을 사용한다', async () => {
    const { getImpactCompare } = await import('@/shared/lib/queries/impact')
    vi.mocked(getImpactCompare).mockClear()
    await GET(mkRequest({ date: '2026-03-01', days: '999' }) as never)
    expect(getImpactCompare).toHaveBeenCalledWith('2026-03-01', 7, expect.any(String), expect.any(String))
  })
})
