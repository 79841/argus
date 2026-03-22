import type { APIRequestContext } from '@playwright/test'
import type { Page } from '@playwright/test'
import claudeFixture from '../fixtures/claude-code.json'
import codexFixture from '../fixtures/codex-cli.json'
import geminiFixture from '../fixtures/gemini-cli.json'

export { claudeFixture, codexFixture, geminiFixture }

export const sendOtlpPayload = async (request: APIRequestContext, payload: object) => {
  return request.post('/v1/logs', {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const seedAgentData = async (request: APIRequestContext) => {
  await sendOtlpPayload(request, claudeFixture)
  await sendOtlpPayload(request, codexFixture)
  await sendOtlpPayload(request, geminiFixture)
}

export const getSessions = (json: Record<string, unknown>): Array<Record<string, unknown>> => {
  const sessions = json.sessions ?? json
  return Array.isArray(sessions) ? sessions : []
}

export const getModels = (json: Record<string, unknown>): Array<Record<string, unknown>> => {
  const models = json.models ?? json
  return Array.isArray(models) ? models : []
}

export const collectPageErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}
