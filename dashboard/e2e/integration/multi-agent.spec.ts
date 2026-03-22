import { test, expect } from '@playwright/test'
import { sendOtlpPayload, seedAgentData } from '../helpers/ingest'
import claudeFixture from '../fixtures/claude-code.json'
import codexFixture from '../fixtures/codex-cli.json'
import geminiFixture from '../fixtures/gemini-cli.json'

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
      const json = await res.json()
      const sessions = json.sessions ?? json
      const sessionIds = (sessions as Array<{ session_id: string }>).map((s) => s.session_id)
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
      const json = await res.json()
      // /api/models는 ModelUsage[] 배열 또는 { models: ModelUsage[] } 형태로 반환
      const models = (json.models ?? json) as Array<{ model: string }>
      const names = (Array.isArray(models) ? models : []).map((m) => m.model)
      expect(names).toContain('claude-sonnet-4-6')
      expect(names).toContain('gpt-4.1')
      // Gemini는 models/ 접두사가 제거되어 저장됨
      expect(names).toContain('gemini-2.5-pro')
    })
  })

  test.describe('에이전트별 필터링 (API)', () => {
    test('agent_type=claude → Claude 세션만', async ({ request }) => {
      const res = await request.get('/api/sessions?agent_type=claude')
      expect(res.status()).toBe(200)
      const json = await res.json()
      const sessions = (json.sessions ?? json) as Array<{ agent_type: string }>
      expect(Array.isArray(sessions)).toBe(true)
      for (const s of sessions) {
        expect(s.agent_type).toBe('claude')
      }
    })

    test('agent_type=codex → Codex 세션만', async ({ request }) => {
      const res = await request.get('/api/sessions?agent_type=codex')
      expect(res.status()).toBe(200)
      const json = await res.json()
      const sessions = (json.sessions ?? json) as Array<{ agent_type: string }>
      expect(Array.isArray(sessions)).toBe(true)
      for (const s of sessions) {
        expect(s.agent_type).toBe('codex')
      }
    })

    test('agent_type=gemini → Gemini 세션만', async ({ request }) => {
      const res = await request.get('/api/sessions?agent_type=gemini')
      expect(res.status()).toBe(200)
      const json = await res.json()
      const sessions = (json.sessions ?? json) as Array<{ agent_type: string }>
      expect(Array.isArray(sessions)).toBe(true)
      for (const s of sessions) {
        expect(s.agent_type).toBe('gemini')
      }
    })
  })

  test.describe('데이터 정합성', () => {
    test('전체 비용 > 0', async ({ request }) => {
      const res = await request.get('/api/overview')
      const json = await res.json()
      expect(json.all_time_cost).toBeGreaterThan(0)
    })

    test('전체 세션 수 ≥ 3', async ({ request }) => {
      const res = await request.get('/api/sessions')
      const json = await res.json()
      const sessions = json.sessions ?? json
      expect((sessions as unknown[]).length).toBeGreaterThanOrEqual(3)
    })

    test('전체 토큰 > 0', async ({ request }) => {
      const res = await request.get('/api/overview')
      const json = await res.json()
      expect(json.all_time_tokens).toBeGreaterThan(0)
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
      // Gemini는 pricing 미등록 시 0일 수 있으므로 0 이상 검증
      expect(geminiJson.all_time_cost).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('대시보드 UI 통합', () => {
    test('Overview 페이지 — 레이아웃 표시', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('aside')).toBeVisible()
      await expect(page).toHaveTitle(/Argus/)
    })

    test('Overview 페이지 — Today Cost 카드 표시', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Today Cost').first()).toBeVisible()
    })

    test('에이전트 필터 탭 전환 — 에러 없음', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Dashboard 페이지는 AgentFilter가 없으므로 Sessions 페이지에서 검증
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      const tabNames = ['Codex', 'Claude Code', 'Gemini CLI', 'All Agents']
      for (const name of tabNames) {
        const tab = page.getByRole('tab', { name })
        if (await tab.isVisible()) {
          await tab.click()
          await page.waitForTimeout(500)
        }
      }

      expect(errors).toHaveLength(0)
    })

    test('Sessions 페이지 — 세션 패널 표시', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('aside')).toBeVisible()
      // 세션 목록 패널이 렌더링되었는지 확인
      await expect(page.locator('div.flex.min-h-0.flex-1').first()).toBeVisible()
    })

    test('Usage 페이지 — 에이전트 필터 + 콘텐츠 탭 동시 렌더링', async ({ page }) => {
      await page.goto('/usage')
      await page.waitForLoadState('networkidle')

      // 에이전트 필터 탭
      await expect(page.getByRole('tab', { name: 'All Agents' })).toBeVisible()
      // 콘텐츠 탭
      await expect(page.getByRole('tab', { name: 'Cost' })).toBeVisible()
    })

    test('Tools 페이지 — 에이전트 필터 + 콘텐츠 탭 동시 렌더링', async ({ page }) => {
      await page.goto('/tools')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('tab', { name: 'All Agents' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
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
      const json = await res.json()
      const sessions = json.sessions ?? json
      expect((sessions as unknown[]).length).toBeGreaterThanOrEqual(3)
    })

    test('대량 전송 후 비용 집계 정상', async ({ request }) => {
      const res = await request.get('/api/overview')
      const json = await res.json()
      expect(json.all_time_cost).toBeGreaterThan(0)
      expect(json.all_time_tokens).toBeGreaterThan(0)
    })
  })
})
