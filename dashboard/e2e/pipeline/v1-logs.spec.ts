import { test, expect } from '@playwright/test'
import { sendOtlpPayload, claudeFixture, codexFixture, geminiFixture } from '../helpers/ingest'

test.describe('OTLP v1/logs 엔드포인트', () => {
  test('정상 페이로드 — 200 응답', async ({ request }) => {
    const res = await sendOtlpPayload(request, claudeFixture)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.accepted).toBeGreaterThan(0)
  })

  test('빈 resourceLogs — 200 응답, accepted 0', async ({ request }) => {
    const res = await sendOtlpPayload(request, { resourceLogs: [] })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.accepted).toBe(0)
  })

  test('빈 객체 — 200 응답, accepted 0', async ({ request }) => {
    const res = await sendOtlpPayload(request, {})
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.accepted).toBe(0)
  })

  test('멀티 에이전트 단일 요청 — 3개 모두 수집', async ({ request }) => {
    const payload = {
      resourceLogs: [
        ...claudeFixture.resourceLogs,
        ...codexFixture.resourceLogs,
        ...geminiFixture.resourceLogs,
      ],
    }
    const res = await sendOtlpPayload(request, payload)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.accepted).toBeGreaterThanOrEqual(3)
  })
})
