import { test, expect } from '@playwright/test'

test('health check', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
})

test('Overview 페이지 접속', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveTitle(/Argus/)
})
