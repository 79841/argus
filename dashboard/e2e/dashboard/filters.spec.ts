import { test, expect } from '@playwright/test'
import { seedAgentData, collectPageErrors } from '../helpers/ingest'

const AGENT_TABS = ['All Agents', 'Codex', 'Claude Code', 'Gemini CLI']

test.describe('에이전트 필터', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  for (const pagePath of ['/sessions', '/usage', '/tools']) {
    test.describe(`${pagePath} 필터`, () => {
      test('에이전트 탭 4개 렌더링', async ({ page }) => {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
        for (const name of AGENT_TABS) {
          await expect(page.getByRole('tab', { name })).toBeVisible()
        }
      })

      test('All Agents 탭 기본 활성', async ({ page }) => {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('tab', { name: 'All Agents' })).toHaveAttribute('aria-selected', 'true')
      })
    })
  }

  test.describe('Sessions 페이지 상세', () => {
    test('Claude Code 탭 클릭 시 활성화', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')
      const claudeTab = page.getByRole('tab', { name: 'Claude Code' })
      await claudeTab.click()
      await expect(claudeTab).toHaveAttribute('aria-selected', 'true')
    })

    test('탭 전환 후 이전 탭은 비활성화', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')
      const allTab = page.getByRole('tab', { name: 'All Agents' })
      const claudeTab = page.getByRole('tab', { name: 'Claude Code' })
      await claudeTab.click()
      await expect(claudeTab).toHaveAttribute('aria-selected', 'true')
      await expect(allTab).toHaveAttribute('aria-selected', 'false')
    })

    test('탭 전환 시 페이지 에러 없음', async ({ page }) => {
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
  })

  test.describe('Usage 페이지 상세', () => {
    test('Usage 탭(Cost/Tokens/Models) 전환', async ({ page }) => {
      await page.goto('/usage')
      await page.waitForLoadState('networkidle')

      for (const name of ['Tokens', 'Models', 'Cost']) {
        const tab = page.getByRole('tab', { name })
        await tab.click()
        await expect(tab).toHaveAttribute('aria-selected', 'true')
      }
    })
  })
})
