import { describe, it, expect } from 'vitest'

const { GET } = await import('../route')

describe('GET /api/health', () => {
  it('GET 요청 → 200 + { status: "ok" }', async () => {
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
  })

  it('응답에 timestamp 포함', async () => {
    const res = await GET()
    const json = await res.json()

    expect(json).toHaveProperty('timestamp')
    expect(typeof json.timestamp).toBe('string')
  })

  it('timestamp가 유효한 ISO 8601 형식', async () => {
    const res = await GET()
    const json = await res.json()

    const parsed = new Date(json.timestamp)
    expect(parsed.getTime()).not.toBeNaN()
  })
})
