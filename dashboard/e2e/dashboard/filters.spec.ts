import { test, expect } from '@playwright/test'
import { seedAgentData } from '../helpers/ingest'

test.describe('에이전트 필터', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  test.describe('Sessions 페이지 필터', () => {
    test('에이전트 탭 4개 렌더링', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      // AgentFilter는 Tabs/TabsTrigger로 구성 — 4개 에이전트 탭이 존재해야 한다
      await expect(page.getByRole('tab', { name: 'All Agents' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Codex' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Claude Code' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Gemini CLI' })).toBeVisible()
    })

    test('All Agents 탭 기본 활성', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      const allTab = page.getByRole('tab', { name: 'All Agents' })
      await expect(allTab).toHaveAttribute('aria-selected', 'true')
    })

    test('Claude Code 탭 클릭 시 활성화', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      const claudeTab = page.getByRole('tab', { name: 'Claude Code' })
      await claudeTab.click()
      await expect(claudeTab).toHaveAttribute('aria-selected', 'true')
    })

    test('Codex 탭 클릭 시 활성화', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      const codexTab = page.getByRole('tab', { name: 'Codex' })
      await codexTab.click()
      await expect(codexTab).toHaveAttribute('aria-selected', 'true')
    })

    test('Gemini CLI 탭 클릭 시 활성화', async ({ page }) => {
      await page.goto('/sessions')
      await page.waitForLoadState('networkidle')

      const geminiTab = page.getByRole('tab', { name: 'Gemini CLI' })
      await geminiTab.click()
      await expect(geminiTab).toHaveAttribute('aria-selected', 'true')
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
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

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
  })

  test.describe('Usage 페이지 필터', () => {
    test('에이전트 탭 4개 렌더링', async ({ page }) => {
      await page.goto('/usage')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('tab', { name: 'All Agents' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Codex' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Claude Code' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Gemini CLI' })).toBeVisible()
    })

    test('All Agents 탭 기본 활성', async ({ page }) => {
      await page.goto('/usage')
      await page.waitForLoadState('networkidle')

      const allTab = page.getByRole('tab', { name: 'All Agents' })
      await expect(allTab).toHaveAttribute('aria-selected', 'true')
    })

    test('Usage 탭(Cost/Tokens/Models) 전환', async ({ page }) => {
      await page.goto('/usage')
      await page.waitForLoadState('networkidle')

      const tokensTab = page.getByRole('tab', { name: 'Tokens' })
      await tokensTab.click()
      await expect(tokensTab).toHaveAttribute('aria-selected', 'true')

      const modelsTab = page.getByRole('tab', { name: 'Models' })
      await modelsTab.click()
      await expect(modelsTab).toHaveAttribute('aria-selected', 'true')

      const costTab = page.getByRole('tab', { name: 'Cost' })
      await costTab.click()
      await expect(costTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  test.describe('Tools 페이지 필터', () => {
    test('에이전트 탭 4개 렌더링', async ({ page }) => {
      await page.goto('/tools')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('tab', { name: 'All Agents' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Codex' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Claude Code' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Gemini CLI' })).toBeVisible()
    })

    test('All Agents 탭 기본 활성', async ({ page }) => {
      await page.goto('/tools')
      await page.waitForLoadState('networkidle')

      const allTab = page.getByRole('tab', { name: 'All Agents' })
      await expect(allTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})
