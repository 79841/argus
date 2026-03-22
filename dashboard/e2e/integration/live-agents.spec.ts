import { test, expect } from '@playwright/test'
import { AGENT_RUNNERS } from '../helpers/agent-runner'
import type { AgentResult } from '../helpers/agent-runner'
import { getSessions } from '../helpers/ingest'

test.skip(!!process.env.CI, 'Live agent tests are skipped in CI')

const BASE_URL = 'http://localhost:9845'

const skipIfUnavailable = (name: string, result: AgentResult) => {
  if (result.error?.includes('설치되지 않았습니다')) {
    test.skip(true, `${name} 미설치`)
    return true
  }
  if (result.isRateLimited) {
    console.warn(`${name} rate limit 감지:`, result.stderr || result.stdout)
    test.skip(true, `${name} rate limit 초과`)
    return true
  }
  if (result.isTokenLimitExceeded) {
    console.warn(`${name} 토큰 한도 초과:`, result.stderr || result.stdout)
    test.skip(true, `${name} 토큰 한도 초과`)
    return true
  }
  return false
}

test.describe.serial('실제 에이전트 연결 E2E', () => {
  test('에이전트 연결 상태 보고', async () => {
    const report: string[] = []
    for (const { name, runner } of AGENT_RUNNERS) {
      const result = await runner(BASE_URL)
      if (result.error?.includes('설치되지 않았습니다')) {
        report.push(`${name}: 미설치`)
      } else if (result.isRateLimited) {
        report.push(`${name}: Rate limit 초과`)
      } else if (result.isTokenLimitExceeded) {
        report.push(`${name}: 토큰 한도 초과`)
      } else if (result.success) {
        report.push(`${name}: 연결 성공`)
      } else {
        report.push(`${name}: 실행 실패 — ${result.error}`)
      }
    }
    console.log('\n에이전트 연결 상태 보고:\n' + report.join('\n'))
  })

  for (const { name, agentType, runner } of AGENT_RUNNERS) {
    test(`${name} — 실행 및 텔레메트리 수신`, async ({ request }) => {
      const result = await runner(BASE_URL)
      if (skipIfUnavailable(name, result)) return

      expect(result.success).toBe(true)

      await expect(async () => {
        const res = await request.get(`/api/sessions?agent_type=${agentType}`)
        const sessions = getSessions(await res.json())
        expect(sessions.length).toBeGreaterThan(0)
      }).toPass({ timeout: 10_000, intervals: [1000] })
    })
  }

  test('실행된 에이전트가 Overview에 반영', async ({ request }) => {
    const res = await request.get('/api/overview')
    const json = await res.json()
    expect(json.all_time_tokens).toBeGreaterThan(0)
  })
})
