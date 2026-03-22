import { test, expect } from '@playwright/test'

test.describe('네비게이션', () => {
  // Nav는 기본 collapsed(w-14) 상태이므로 href로 직접 링크를 찾는다
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
    // 루트 경로로 이동했는지 확인 (sessions이 포함되지 않아야 함)
    expect(page.url()).not.toContain('/sessions')
  })

  test('사이드바가 aside 태그로 렌더링', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('aside')).toBeVisible()
  })

  test('현재 경로와 일치하는 링크가 active 스타일 적용', async ({ page }) => {
    await page.goto('/sessions')
    await page.waitForLoadState('networkidle')

    // sessions 링크가 primary 배경(bg-primary) 클래스를 가지는지 확인
    const activeLink = page.locator('aside a[href="/sessions"]').first()
    await expect(activeLink).toBeVisible()
    // primary 클래스가 적용된 링크가 존재하면 active 상태임
    const className = await activeLink.getAttribute('class')
    expect(className).toContain('bg-primary')
  })

  test('연속 페이지 이동 — 에러 없음', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

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
