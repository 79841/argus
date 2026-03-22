import { test, expect } from '@playwright/test'
import { collectPageErrors } from '../helpers/ingest'

test.describe('네비게이션', () => {
  const sidebarLinks = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/usage', label: 'Usage' },
    { href: '/tools', label: 'Tools' },
    { href: '/projects', label: 'Projects' },
    { href: '/rules', label: 'Rules' },
    { href: '/insights', label: 'Insights' },
    { href: '/settings', label: 'Settings' },
  ]

  for (const { href, label } of sidebarLinks) {
    test(`사이드바 ${label} 클릭 → ${href} 이동`, async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const link = page.locator(`aside a[href="${href}"]`).first()
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForURL(`**${href}`)
      expect(page.url()).toContain(href)
    })
  }

  test('Dashboard 링크(/) 클릭 → Overview 이동', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')

    const link = page.locator('aside a[href="/"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await page.waitForURL('**/')
    expect(page.url()).not.toContain('/sessions')
  })

  test('현재 경로와 일치하는 링크가 active 스타일 적용', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')

    const activeLink = page.locator('aside a[href="/sessions"]').first()
    await expect(activeLink).toBeVisible()
    const className = await activeLink.getAttribute('class')
    expect(className).toContain('bg-primary')
  })

  test('연속 페이지 이동 — 에러 없음', async ({ page }) => {
    const errors = collectPageErrors(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hrefs = ['/sessions', '/usage', '/tools', '/projects', '/rules', '/insights', '/settings', '/']
    for (const href of hrefs) {
      const link = page.locator(`aside a[href="${href}"]`).first()
      if (await link.isVisible()) {
        await link.click()
        await page.waitForURL(`**${href === '/' ? '' : href}`)
        await page.waitForLoadState('networkidle')
      }
    }

    expect(errors).toHaveLength(0)
  })
})
