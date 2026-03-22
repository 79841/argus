import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type AgentResult = {
  success: boolean
  stdout: string
  stderr: string
  error?: string
  isRateLimited?: boolean
  isTokenLimitExceeded?: boolean
}

const isAgentInstalled = async (command: string): Promise<boolean> => {
  try {
    await execFileAsync('which', [command])
    return true
  } catch {
    return false
  }
}

const getOtlpEnv = (baseUrl: string) => ({
  ...process.env,
  OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
  OTEL_EXPORTER_OTLP_ENDPOINT: baseUrl,
})

const detectRateLimitError = (output: string): { isRateLimited: boolean; isTokenLimitExceeded: boolean } => {
  const lower = output.toLowerCase()
  return {
    isRateLimited:
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('too many requests') ||
      lower.includes('rate_limit'),
    isTokenLimitExceeded:
      lower.includes('token limit') ||
      lower.includes('quota') ||
      lower.includes('exceeded') ||
      lower.includes('insufficient') ||
      lower.includes('billing') ||
      lower.includes('usage limit'),
  }
}

export const runClaudeCode = async (baseUrl: string): Promise<AgentResult> => {
  if (!(await isAgentInstalled('claude'))) {
    return { success: false, stdout: '', stderr: '', error: 'Claude Code CLI가 설치되지 않았습니다' }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'claude',
      ['--print', 'say "e2e test ping" and nothing else'],
      {
        env: {
          ...getOtlpEnv(baseUrl),
          CLAUDE_CODE_ENABLE_TELEMETRY: '1',
          OTEL_LOGS_EXPORTER: 'otlp',
        },
        timeout: 60_000,
      }
    )
    const combined = stdout + stderr
    const rateLimit = detectRateLimitError(combined)
    return { success: true, stdout, stderr, ...rateLimit }
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string }
    const combined = (error.stdout ?? '') + (error.stderr ?? '') + error.message
    const rateLimit = detectRateLimitError(combined)
    return {
      success: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error: error.message,
      ...rateLimit,
    }
  }
}

export const runCodexCli = async (baseUrl: string): Promise<AgentResult> => {
  if (!(await isAgentInstalled('codex'))) {
    return { success: false, stdout: '', stderr: '', error: 'Codex CLI가 설치되지 않았습니다' }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'codex',
      ['exec', '--config', 'otel.exporter=otlp-http', '--config', `otel.endpoint="${baseUrl}"`, 'say "e2e test ping" and nothing else'],
      {
        env: getOtlpEnv(baseUrl),
        timeout: 60_000,
      }
    )
    const combined = stdout + stderr
    const rateLimit = detectRateLimitError(combined)
    return { success: true, stdout, stderr, ...rateLimit }
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string }
    const combined = (error.stdout ?? '') + (error.stderr ?? '') + error.message
    const rateLimit = detectRateLimitError(combined)
    return {
      success: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error: error.message,
      ...rateLimit,
    }
  }
}

export const runGeminiCli = async (baseUrl: string): Promise<AgentResult> => {
  if (!(await isAgentInstalled('gemini'))) {
    return { success: false, stdout: '', stderr: '', error: 'Gemini CLI가 설치되지 않았습니다' }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'gemini',
      ['--prompt', 'say "e2e test ping" and nothing else', '--yolo'],
      {
        env: {
          ...getOtlpEnv(baseUrl),
          GEMINI_TELEMETRY_ENABLED: 'true',
          GEMINI_TELEMETRY_TARGET: 'local',
          GEMINI_TELEMETRY_OTLP_ENDPOINT: baseUrl,
          GEMINI_TELEMETRY_OTLP_PROTOCOL: 'http',
        },
        timeout: 60_000,
      }
    )
    const combined = stdout + stderr
    const rateLimit = detectRateLimitError(combined)
    return { success: true, stdout, stderr, ...rateLimit }
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string }
    const combined = (error.stdout ?? '') + (error.stderr ?? '') + error.message
    const rateLimit = detectRateLimitError(combined)
    return {
      success: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error: error.message,
      ...rateLimit,
    }
  }
}
