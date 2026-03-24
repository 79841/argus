import type { APIRequestContext } from '@playwright/test'
import type { Page } from '@playwright/test'
import claudeFixture from '../fixtures/claude-code.json'
import codexFixture from '../fixtures/codex-cli.json'
import geminiFixture from '../fixtures/gemini-cli.json'

export { claudeFixture, codexFixture, geminiFixture }

const nowNano = () => String(Date.now() * 1_000_000)

type OtlpFixture = {
  resourceLogs: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue?: string } }> }
    scopeLogs: Array<{
      logRecords: Array<Record<string, unknown>>
    }>
  }>
}

const withDynamicTimestamps = (fixture: OtlpFixture): OtlpFixture => ({
  ...fixture,
  resourceLogs: fixture.resourceLogs.map(rl => ({
    ...rl,
    scopeLogs: rl.scopeLogs.map(sl => ({
      ...sl,
      logRecords: sl.logRecords.map(lr => ({
        ...lr,
        timeUnixNano: nowNano(),
      })),
    })),
  })),
})

export const sendOtlpPayload = async (request: APIRequestContext, payload: object) => {
  return request.post('/v1/logs', {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const seedAgentData = async (request: APIRequestContext) => {
  await Promise.all([
    sendOtlpPayload(request, withDynamicTimestamps(claudeFixture as OtlpFixture)),
    sendOtlpPayload(request, withDynamicTimestamps(codexFixture as OtlpFixture)),
    sendOtlpPayload(request, withDynamicTimestamps(geminiFixture as OtlpFixture)),
  ])
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
