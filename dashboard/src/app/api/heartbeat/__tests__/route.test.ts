import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { HeartbeatPoint } from '@/shared/lib/queries'

vi.mock('@/shared/lib/queries', () => ({
  getHeartbeatData: vi.fn(),
}))

const { GET } = await import('../route')
import { getHeartbeatData } from '@/shared/lib/queries'

const mkRequest = (params: Record<string, string> = {}): NextRequest => {
  const url = new URL('http://localhost:9845/api/heartbeat')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const mockData: HeartbeatPoint[] = [
  { minute: '2026-03-27T14:30', agent_type: 'claude', total_tokens: 1500 },
  { minute: '2026-03-27T14:31', agent_type: 'claude', total_tokens: 800 },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getHeartbeatData).mockReturnValue(mockData)
})

describe('GET /api/heartbeat', () => {
  it('200과 JSON을 반환한다', async () => {
    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toBeDefined()
  })

  it('응답에 data, minutes, agent_type이 포함된다', async () => {
    const res = await GET(mkRequest())
    const json = await res.json()
    expect(json.data).toEqual(mockData)
    expect(json.minutes).toBe(5)
    expect(json.agent_type).toBe('all')
  })

  it('?minutes=10 → getHeartbeatData에 10 전달', async () => {
    await GET(mkRequest({ minutes: '10' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 10)
  })

  it('?minutes=1 → 최솟값 1 허용', async () => {
    await GET(mkRequest({ minutes: '1' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 1)
  })

  it('?minutes=60 → 최댓값 60 허용', async () => {
    await GET(mkRequest({ minutes: '60' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 60)
  })

  it('?minutes=0 → 기본값 5로 폴백', async () => {
    await GET(mkRequest({ minutes: '0' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 5)
  })

  it('?minutes=61 → 기본값 5로 폴백', async () => {
    await GET(mkRequest({ minutes: '61' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 5)
  })

  it('?minutes=abc → 기본값 5로 폴백', async () => {
    await GET(mkRequest({ minutes: 'abc' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 5)
  })

  it('minutes 파라미터 없으면 기본값 5 사용', async () => {
    await GET(mkRequest())
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 5)
  })

  it('?agent_type=claude → getHeartbeatData에 "claude" 전달', async () => {
    await GET(mkRequest({ agent_type: 'claude' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('claude', 5)
  })

  it('?agent_type=codex → getHeartbeatData에 "codex" 전달', async () => {
    await GET(mkRequest({ agent_type: 'codex' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('codex', 5)
  })

  it('?agent_type=invalid → "all"로 폴백', async () => {
    await GET(mkRequest({ agent_type: 'invalid' }))
    expect(getHeartbeatData).toHaveBeenCalledWith('all', 5)
  })

  it('쿼리 함수 에러 시 500을 반환한다', async () => {
    vi.mocked(getHeartbeatData).mockImplementation(() => {
      throw new Error('DB error')
    })
    const res = await GET(mkRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
