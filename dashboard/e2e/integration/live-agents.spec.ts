import { test, expect } from '@playwright/test'
import { runClaudeCode, runCodexCli, runGeminiCli } from '../helpers/agent-runner'
import { getSessions } from '../helpers/ingest'

test.skip(!!process.env.CI, 'Live agent tests are skipped in CI')

const BASE_URL = 'http://localhost:9845'

test.describe.serial('실제 에이전트 연결 E2E', () => {
  test('에이전트 연결 상태 보고', async () => {
    const agents = [
      { name: 'Claude Code', runner: runClaudeCode },
      { name: 'Codex CLI', runner: runCodexCli },
      { name: 'Gemini CLI', runner: runGeminiCli },
    ] as const

    const report: string[] = []
    for (const { name, runner } of agents) {
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

  test.describe('Claude Code', () => {
    test('에이전트 실행 및 텔레메트리 수신', async ({ request }) => {
      const result = await runClaudeCode(BASE_URL)

      if (result.error?.includes('설치되지 않았습니다')) {
        test.skip(true, 'Claude Code CLI 미설치')
        return
      }

      if (result.isRateLimited) {
        console.warn('Claude Code rate limit 감지:', result.stderr || result.stdout)
        test.skip(true, 'Claude Code rate limit 초과')
        return
      }

      if (result.isTokenLimitExceeded) {
        console.warn('Claude Code 토큰 한도 초과:', result.stderr || result.stdout)
        test.skip(true, 'Claude Code 토큰 한도 초과')
        return
      }

      expect(result.success).toBe(true)

      await expect(async () => {
        const res = await request.get('/api/sessions?agent_type=claude')
        const sessions = getSessions(await res.json())
        expect(sessions.length).toBeGreaterThan(0)
      }).toPass({ timeout: 10_000, intervals: [1000] })
    })
  })

  test.describe('Codex CLI', () => {
    test('에이전트 실행 및 텔레메트리 수신', async ({ request }) => {
      const result = await runCodexCli(BASE_URL)

      if (result.error?.includes('설치되지 않았습니다')) {
        test.skip(true, 'Codex CLI 미설치')
        return
      }

      if (result.isRateLimited) {
        console.warn('Codex CLI rate limit 감지:', result.stderr || result.stdout)
        test.skip(true, 'Codex CLI rate limit 초과')
        return
      }

      if (result.isTokenLimitExceeded) {
        console.warn('Codex CLI 토큰 한도 초과:', result.stderr || result.stdout)
        test.skip(true, 'Codex CLI 토큰 한도 초과')
        return
      }

      expect(result.success).toBe(true)

      await expect(async () => {
        const res = await request.get('/api/sessions?agent_type=codex')
        const sessions = getSessions(await res.json())
        expect(sessions.length).toBeGreaterThan(0)
      }).toPass({ timeout: 10_000, intervals: [1000] })
    })
  })

  test.describe('Gemini CLI', () => {
    test('에이전트 실행 및 텔레메트리 수신', async ({ request }) => {
      const result = await runGeminiCli(BASE_URL)

      if (result.error?.includes('설치되지 않았습니다')) {
        test.skip(true, 'Gemini CLI 미설치')
        return
      }

      if (result.isRateLimited) {
        console.warn('Gemini CLI rate limit 감지:', result.stderr || result.stdout)
        test.skip(true, 'Gemini CLI rate limit 초과')
        return
      }

      if (result.isTokenLimitExceeded) {
        console.warn('Gemini CLI 토큰 한도 초과:', result.stderr || result.stdout)
        test.skip(true, 'Gemini CLI 토큰 한도 초과')
        return
      }

      expect(result.success).toBe(true)

      await expect(async () => {
        const res = await request.get('/api/sessions?agent_type=gemini')
        const sessions = getSessions(await res.json())
        expect(sessions.length).toBeGreaterThan(0)
      }).toPass({ timeout: 10_000, intervals: [1000] })
    })
  })

  test('실행된 에이전트가 Overview에 반영', async ({ request }) => {
    const res = await request.get('/api/overview')
    const json = await res.json()
    expect(json.all_time_tokens).toBeGreaterThan(0)
  })
})
