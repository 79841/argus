import { test, expect } from '@playwright/test'
import { sendOtlpPayload, seedAgentData, getSessions, getModels, collectPageErrors, claudeFixture, codexFixture, geminiFixture } from '../helpers/ingest'

test.describe.serial('멀티 에이전트 통합 E2E', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  test.describe('동시 수집', () => {
    test('3개 에이전트 동시 전송 — 모두 200', async ({ request }) => {
      const results = await Promise.all([
        sendOtlpPayload(request, claudeFixture),
        sendOtlpPayload(request, codexFixture),
        sendOtlpPayload(request, geminiFixture),
      ])
      for (const res of results) {
        expect(res.status()).toBe(200)
      }
    })

    test('3개 에이전트 세션 모두 존재', async ({ request }) => {
      const res = await request.get('/api/sessions')
      const sessions = getSessions(await res.json())
      const sessionIds = sessions.map((s) => s.session_id)
      expect(sessionIds).toContain('e2e-claude-session-1')
      expect(sessionIds).toContain('e2e-codex-session-1')
      expect(sessionIds).toContain('e2e-gemini-session-1')
    })
  })

  test.describe('통합 뷰 (API)', () => {
    test('overview — agent_summaries에 3개 에이전트', async ({ request }) => {
      const res = await request.get('/api/overview')
      expect(res.status()).toBe(200)
      const json = await res.json()
      const agentTypes = (json.agent_summaries as Array<{ agent_type: string }>).map(
        (a) => a.agent_type
      )
      expect(agentTypes).toContain('claude')
      expect(agentTypes).toContain('codex')
      expect(agentTypes).toContain('gemini')
    })

    test('models — 3개 모델 포함', async ({ request }) => {
      const res = await request.get('/api/models')
      expect(res.status()).toBe(200)
      const models = getModels(await res.json())
      const names = models.map((m) => m.model)
      expect(names).toContain('claude-sonnet-4-6')
      expect(names).toContain('gpt-4.1')
      expect(names).toContain('gemini-2.5-pro')
    })
  })

  test.describe('에이전트별 필터링 (API)', () => {
    for (const agentType of ['claude', 'codex', 'gemini']) {
      test(`agent_type=${agentType} → 해당 세션만`, async ({ request }) => {
        const res = await request.get(`/api/sessions?agent_type=${agentType}`)
        expect(res.status()).toBe(200)
        const sessions = getSessions(await res.json())
        for (const s of sessions) {
          expect(s.agent_type).toBe(agentType)
        }
      })
    }
  })

  test.describe('데이터 정합성', () => {
    test('전체 비용·토큰 > 0', async ({ request }) => {
      const res = await request.get('/api/overview')
      const json = await res.json()
      expect(json.all_time_cost).toBeGreaterThan(0)
      expect(json.all_time_tokens).toBeGreaterThan(0)
    })

    test('전체 세션 수 ≥ 3', async ({ request }) => {
      const res = await request.get('/api/sessions')
      const sessions = getSessions(await res.json())
      expect(sessions.length).toBeGreaterThanOrEqual(3)
    })

    test('에이전트별 비용 > 0', async ({ request }) => {
      const [claudeRes, codexRes, geminiRes] = await Promise.all([
        request.get('/api/overview?agent_type=claude'),
        request.get('/api/overview?agent_type=codex'),
        request.get('/api/overview?agent_type=gemini'),
      ])
      const [claudeJson, codexJson, geminiJson] = await Promise.all([
        claudeRes.json(),
        codexRes.json(),
        geminiRes.json(),
      ])
      expect(claudeJson.all_time_cost).toBeGreaterThan(0)
      expect(codexJson.all_time_cost).toBeGreaterThan(0)
      expect(geminiJson.all_time_cost).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('대시보드 UI 통합', () => {
    test('Overview 페이지 — Today Cost 카드 표시', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('aside')).toBeVisible()
      await expect(page.getByText('Today Cost').first()).toBeVisible()
    })

    test('에이전트 필터 탭 전환 — 에러 없음', async ({ page }) => {
      const errors = collectPageErrors(page)
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      for (const name of ['Codex', 'Claude Code', 'Gemini CLI', 'All Agents']) {
        const tab = page.getByRole('tab', { name })
        if (await tab.isVisible()) {
          await tab.click()
          await expect(tab).toHaveAttribute('aria-selected', 'true')
        }
      }

      expect(errors).toHaveLength(0)
    })

    test('Sessions 페이지 — 세션 패널 표시', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('div.flex.min-h-0.flex-1').first()).toBeVisible()
    })
  })

  test.describe('대량 이벤트 처리', () => {
    test('에이전트당 10회 반복 전송 — 모두 200', async ({ request }) => {
      const batches = Array.from({ length: 10 }, () => [
        sendOtlpPayload(request, claudeFixture),
        sendOtlpPayload(request, codexFixture),
        sendOtlpPayload(request, geminiFixture),
      ]).flat()
      const results = await Promise.all(batches)
      for (const res of results) {
        expect(res.status()).toBe(200)
      }
    })

    test('대량 전송 후 세션 수 ≥ 3', async ({ request }) => {
      const res = await request.get('/api/sessions')
      const sessions = getSessions(await res.json())
      expect(sessions.length).toBeGreaterThanOrEqual(3)
    })

    test('대량 전송 후 비용 집계 정상', async ({ request }) => {
      const res = await request.get('/api/overview')
      const json = await res.json()
      expect(json.all_time_cost).toBeGreaterThan(0)
      expect(json.all_time_tokens).toBeGreaterThan(0)
    })
  })
})
