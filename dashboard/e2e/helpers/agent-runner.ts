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

type AgentConfig = {
  command: string
  args: (baseUrl: string) => string[]
  env: (baseUrl: string) => Record<string, string>
  notInstalledMessage: string
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  claude: {
    command: 'claude',
    args: () => ['--print', 'say "e2e test ping" and nothing else'],
    env: (baseUrl) => ({
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
      OTEL_EXPORTER_OTLP_ENDPOINT: baseUrl,
      CLAUDE_CODE_ENABLE_TELEMETRY: '1',
      OTEL_LOGS_EXPORTER: 'otlp',
    }),
    notInstalledMessage: 'Claude Code CLI가 설치되지 않았습니다',
  },
  codex: {
    command: 'codex',
    args: (baseUrl) => ['exec', '--config', `otel.exporter.otlp-http.endpoint="${baseUrl}/v1/logs"`, '--config', 'otel.exporter.otlp-http.protocol="json"', 'say "e2e test ping" and nothing else'],
    env: (baseUrl) => ({
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
      OTEL_EXPORTER_OTLP_ENDPOINT: baseUrl,
    }),
    notInstalledMessage: 'Codex CLI가 설치되지 않았습니다',
  },
  gemini: {
    command: 'gemini',
    args: () => ['--prompt', 'say "e2e test ping" and nothing else', '--yolo'],
    env: (baseUrl) => ({
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
      OTEL_EXPORTER_OTLP_ENDPOINT: baseUrl,
      GEMINI_TELEMETRY_ENABLED: 'true',
      GEMINI_TELEMETRY_TARGET: 'local',
      GEMINI_TELEMETRY_OTLP_ENDPOINT: baseUrl,
      GEMINI_TELEMETRY_OTLP_PROTOCOL: 'http',
    }),
    notInstalledMessage: 'Gemini CLI가 설치되지 않았습니다',
  },
}

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

const runAgent = async (config: AgentConfig, baseUrl: string): Promise<AgentResult> => {
  try {
    await execFileAsync('which', [config.command])
  } catch {
    return { success: false, stdout: '', stderr: '', error: config.notInstalledMessage }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      config.command,
      config.args(baseUrl),
      {
        env: { ...process.env, ...config.env(baseUrl) },
        timeout: 60_000,
      }
    )
    return { success: true, stdout, stderr, ...detectRateLimitError(stdout + stderr) }
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string }
    const combined = (error.stdout ?? '') + (error.stderr ?? '') + error.message
    return {
      success: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      error: error.message,
      ...detectRateLimitError(combined),
    }
  }
}

export const runClaudeCode = (baseUrl: string) => runAgent(AGENT_CONFIGS.claude, baseUrl)
export const runCodexCli = (baseUrl: string) => runAgent(AGENT_CONFIGS.codex, baseUrl)
export const runGeminiCli = (baseUrl: string) => runAgent(AGENT_CONFIGS.gemini, baseUrl)

export const AGENT_RUNNERS = [
  { name: 'Claude Code', agentType: 'claude', runner: runClaudeCode },
  { name: 'Codex CLI', agentType: 'codex', runner: runCodexCli },
  { name: 'Gemini CLI', agentType: 'gemini', runner: runGeminiCli },
] as const
