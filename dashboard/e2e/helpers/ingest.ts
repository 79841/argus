import type { APIRequestContext } from '@playwright/test'
import claudeFixture from '../fixtures/claude-code.json'
import codexFixture from '../fixtures/codex-cli.json'
import geminiFixture from '../fixtures/gemini-cli.json'

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
