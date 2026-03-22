import { test, expect } from '@playwright/test'
import { sendOtlpPayload, seedAgentData } from '../helpers/ingest'
import claudeFixture from '../fixtures/claude-code.json'
import codexFixture from '../fixtures/codex-cli.json'
import geminiFixture from '../fixtures/gemini-cli.json'

test.describe.serial('데이터 파이프라인 E2E', () => {
  test.beforeAll(async ({ request }) => {
    await seedAgentData(request)
  })

  test('Claude Code 수집 — POST /v1/logs 200 응답', async ({ request }) => {
    const res = await sendOtlpPayload(request, claudeFixture)
    expect(res.status()).toBe(200)
  })

  test('Claude Code — /api/sessions에서 세션 확인', async ({ request }) => {
    const res = await request.get('/api/sessions?agent_type=claude')
    const json = await res.json()
    const sessions = json.sessions ?? json
    expect(Array.isArray(sessions)).toBe(true)
    const found = sessions.find((s: { session_id: string }) => s.session_id === 'e2e-claude-session-1')
    expect(found).toBeDefined()
  })

  test('Codex CLI 수집 — POST /v1/logs 200 응답', async ({ request }) => {
    const res = await sendOtlpPayload(request, codexFixture)
    expect(res.status()).toBe(200)
  })

  test('Codex CLI — /api/sessions에서 세션 확인', async ({ request }) => {
    const res = await request.get('/api/sessions?agent_type=codex')
    const json = await res.json()
    const sessions = json.sessions ?? json
    const found = sessions.find((s: { session_id: string }) => s.session_id === 'e2e-codex-session-1')
    expect(found).toBeDefined()
  })

  test('Gemini CLI 수집 — POST /v1/logs 200 응답', async ({ request }) => {
    const res = await sendOtlpPayload(request, geminiFixture)
    expect(res.status()).toBe(200)
  })

  test('Gemini CLI — /api/sessions에서 세션 확인', async ({ request }) => {
    const res = await request.get('/api/sessions?agent_type=gemini')
    const json = await res.json()
    const sessions = json.sessions ?? json
    const found = sessions.find((s: { session_id: string }) => s.session_id === 'e2e-gemini-session-1')
    expect(found).toBeDefined()
  })

  test('/api/overview — 전체 통계 반영', async ({ request }) => {
    const res = await request.get('/api/overview')
    const json = await res.json()
    expect(json.all_time_cost).toBeGreaterThan(0)
    expect(json.all_time_tokens).toBeGreaterThan(0)
  })

  test('/api/daily — 일일 통계 존재', async ({ request }) => {
    const res = await request.get('/api/daily')
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
  })

  test('/api/tools — Claude Read 도구 포함', async ({ request }) => {
    const res = await request.get('/api/tools')
    const json = await res.json()
    const tools = json.tools ?? json
    const readTool = (Array.isArray(tools) ? tools : []).find(
      (t: { tool_name: string }) => t.tool_name === 'Read'
    )
    expect(readTool).toBeDefined()
  })

  test('/api/models — 3개 모델 포함', async ({ request }) => {
    const res = await request.get('/api/models')
    const json = await res.json()
    const models = json.models ?? json
    const modelNames = (Array.isArray(models) ? models : []).map((m: { model: string }) => m.model)
    expect(modelNames).toContain('claude-sonnet-4-6')
    expect(modelNames).toContain('gpt-4.1')
    expect(modelNames).toContain('gemini-2.5-pro')
  })

  test('Claude 비용 — cost_usd > 0', async ({ request }) => {
    const res = await request.get('/api/overview?agent_type=claude')
    const json = await res.json()
    expect(json.all_time_cost).toBeGreaterThan(0)
  })
})
