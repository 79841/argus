import { test, expect } from '@playwright/test'
import { seedAgentData } from '../helpers/ingest'

test.describe('페이지 렌더링', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  test('/ — Overview 페이지 로드', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/sessions — 세션 페이지 로드', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/usage — 사용량 페이지 로드', async ({ page }) => {
    await page.goto('/usage')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/tools — 도구 페이지 로드', async ({ page }) => {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/projects — 프로젝트 페이지 로드', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/insights — 인사이트 페이지 로드', async ({ page }) => {
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/rules — 규칙 페이지 로드', async ({ page }) => {
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    await expect(page.locator('aside')).toBeVisible()
  })

  test('/settings — 설정 페이지 로드', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/Argus/)
    // 설정 페이지: aside(사이드바 Nav) + nav(설정 카테고리) 둘 다 존재
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.locator('nav').first()).toBeVisible()
  })

  test('/ — KPI 카드 영역 렌더링', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Today Cost, Sessions, Requests, Cache Hit Rate 카드가 렌더링되는지 확인
    const costLabel = page.getByText('Today Cost').first()
    await expect(costLabel).toBeVisible()
  })

  test('/sessions — 세션 목록 영역 렌더링', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')
    // 세션 목록 패널 또는 빈 상태 중 하나가 보이는지 확인
    const panel = page.locator('div.flex.min-h-0.flex-1').first()
    await expect(panel).toBeVisible()
  })

  test('/usage — 탭 렌더링', async ({ page }) => {
    await page.goto('/usage')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: 'Cost' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Tokens' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Models' })).toBeVisible()
  })

  test('/tools — KPI 영역 렌더링', async ({ page }) => {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')
    // 도구 페이지 탭 존재 확인
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Trends' })).toBeVisible()
  })

  test('/settings — 카테고리 버튼 렌더링', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    // 설정 카테고리 버튼이 렌더링되는지 확인
    const settingsNav = page.locator('nav.w-48')
    await expect(settingsNav).toBeVisible()
  })

  test('페이지 이동 시 JS 에러 없음', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const routes = ['/', '/sessions', '/usage', '/tools', '/settings']
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })
})
