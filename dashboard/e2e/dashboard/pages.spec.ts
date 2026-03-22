import { test, expect } from '@playwright/test'
import { seedAgentData, collectPageErrors } from '../helpers/ingest'

const pages = ['/', '/sessions', '/usage', '/tools', '/projects', '/insights', '/rules', '/settings']

test.describe('페이지 렌더링', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  for (const route of pages) {
    test(`${route} — 페이지 로드`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveTitle(/Argus/)
      await expect(page.locator('aside')).toBeVisible()
    })
  }

  test('/ — KPI 카드 렌더링', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Today Cost').first()).toBeVisible()
  })

  test('/sessions — 세션 목록 영역 렌더링', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('div.flex.min-h-0.flex-1').first()).toBeVisible()
  })

  test('/usage — 탭 렌더링', async ({ page }) => {
    await page.goto('/usage')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: 'Cost' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Tokens' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Models' })).toBeVisible()
  })

  test('/tools — 탭 렌더링', async ({ page }) => {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Trends' })).toBeVisible()
  })

  test('/settings — 카테고리 nav 렌더링', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('nav.w-48')).toBeVisible()
  })

  test('페이지 이동 시 JS 에러 없음', async ({ page }) => {
    const errors = collectPageErrors(page)
    for (const route of ['/', '/sessions', '/usage', '/tools', '/settings']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }
    expect(errors).toHaveLength(0)
  })
})
