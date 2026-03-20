import fs from 'fs'
import path from 'path'
import os from 'os'

type AgentSetupType = 'claude' | 'codex' | 'gemini'

type AgentStatus = {
  type: AgentSetupType
  configPath: string
  displayPath: string
  installed: boolean
  configured: boolean
  endpoint: string | null
}

type ConnectResult = {
  agent: AgentSetupType
  success: boolean
  action: string
  error?: string
}

const HOME = os.homedir()

const toDisplayPath = (absPath: string): string => {
  if (absPath.startsWith(HOME)) {
    return '~' + absPath.slice(HOME.length)
  }
  return absPath
}

const AGENT_CONFIG_PATHS: Record<AgentSetupType, string> = {
  claude: path.join(HOME, '.claude', 'settings.json'),
  codex: path.join(HOME, '.codex', 'config.toml'),
  gemini: path.join(HOME, '.gemini', 'settings.json'),
}

const AGENT_DIRS: Record<AgentSetupType, string> = {
  claude: path.join(HOME, '.claude'),
  codex: path.join(HOME, '.codex'),
  gemini: path.join(HOME, '.gemini'),
}

const ARGUS_ENV_KEYS = [
  'CLAUDE_CODE_ENABLE_TELEMETRY',
  'OTEL_LOGS_EXPORTER',
  'OTEL_EXPORTER_OTLP_PROTOCOL',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
] as const

const ARGUS_ENV = (endpoint: string) => ({
  CLAUDE_CODE_ENABLE_TELEMETRY: '1',
  OTEL_LOGS_EXPORTER: 'otlp',
  OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
  OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
})

const ARGUS_GEMINI_TELEMETRY = (endpoint: string) => ({
  enabled: true,
  target: 'local',
  otlpEndpoint: endpoint,
  otlpProtocol: 'http',
})

const CODEX_OTEL_SECTION = (endpoint: string) =>
  `\n[otel]\nexporter = "otlp-http"\ntrace_exporter = "otlp-http"\nmetrics_exporter = "otlp-http"\n\n[otel.exporter.otlp-http]\nendpoint = "${endpoint}/v1/logs"\nprotocol = "json"\n`

// Claude

const getClaudeStatus = (configPath: string, defaultEndpoint: string): AgentStatus => {
  const installed = fs.existsSync(path.dirname(configPath))
  if (!fs.existsSync(configPath)) {
    return { type: 'claude', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    const env = data.env as Record<string, string> | undefined
    const endpoint = env?.OTEL_EXPORTER_OTLP_ENDPOINT ?? null
    const configured = endpoint === defaultEndpoint
    return { type: 'claude', configPath, displayPath: toDisplayPath(configPath), installed, configured, endpoint }
  } catch {
    return { type: 'claude', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
}

const connectClaude = (configPath: string, endpoint: string): ConnectResult => {
  try {
    let data: Record<string, unknown> = {}
    if (fs.existsSync(configPath)) {
      try {
        data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
      } catch {
        data = {}
      }
    } else {
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
    const existingEnv = (data.env as Record<string, string> | undefined) ?? {}
    data.env = { ...existingEnv, ...ARGUS_ENV(endpoint) }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return { agent: 'claude', success: true, action: 'OTel 환경 변수를 ~/.claude/settings.json에 병합했다' }
  } catch (err) {
    return { agent: 'claude', success: false, action: '연결 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

const disconnectClaude = (configPath: string): ConnectResult => {
  try {
    if (!fs.existsSync(configPath)) {
      return { agent: 'claude', success: true, action: '설정 파일이 없어 건너뜀' }
    }
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    } catch {
      return { agent: 'claude', success: false, action: '연결 해제 실패', error: '설정 파일 파싱 오류' }
    }
    const env = (data.env as Record<string, string> | undefined) ?? {}
    for (const key of ARGUS_ENV_KEYS) {
      delete env[key]
    }
    if (Object.keys(env).length === 0) {
      delete data.env
    } else {
      data.env = env
    }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return { agent: 'claude', success: true, action: 'OTel 환경 변수를 ~/.claude/settings.json에서 제거했다' }
  } catch (err) {
    return { agent: 'claude', success: false, action: '연결 해제 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

// Codex

const CODEX_OTEL_SECTION_RE = /\[otel(?:\.[^\]]+)?\][\s\S]*?(?=\n\[[^\]]+\](?!\.)|\s*$)/g

const getCodexStatus = (configPath: string, defaultEndpoint: string): AgentStatus => {
  const installed = fs.existsSync(path.dirname(configPath))
  if (!fs.existsSync(configPath)) {
    return { type: 'codex', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    const hasOtel = /\[otel\]/.test(content)
    const endpointMatch = content.match(/endpoint\s*=\s*"([^"]+)"/)
    const endpoint = endpointMatch ? endpointMatch[1].replace(/\/v1\/logs$/, '') : null
    const configured = hasOtel && endpoint === defaultEndpoint
    return { type: 'codex', configPath, displayPath: toDisplayPath(configPath), installed, configured, endpoint }
  } catch {
    return { type: 'codex', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
}

const connectCodex = (configPath: string, endpoint: string): ConnectResult => {
  try {
    const section = CODEX_OTEL_SECTION(endpoint)
    if (!fs.existsSync(configPath)) {
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(configPath, section.trimStart(), 'utf-8')
      return { agent: 'codex', success: true, action: 'OTel 섹션을 ~/.codex/config.toml에 새로 썼다' }
    }
    let content = fs.readFileSync(configPath, 'utf-8')
    if (/\[otel\]/.test(content)) {
      content = replaceCodexOtelSections(content, section)
      fs.writeFileSync(configPath, content, 'utf-8')
      return { agent: 'codex', success: true, action: 'OTel 섹션을 ~/.codex/config.toml에서 교체했다' }
    }
    content = content.trimEnd() + section
    fs.writeFileSync(configPath, content, 'utf-8')
    return { agent: 'codex', success: true, action: 'OTel 섹션을 ~/.codex/config.toml 끝에 추가했다' }
  } catch (err) {
    return { agent: 'codex', success: false, action: '연결 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

const replaceCodexOtelSections = (content: string, newSection: string): string => {
  const lines = content.split('\n')
  const result: string[] = []
  let inOtel = false
  for (const line of lines) {
    if (/^\[otel(\.[^\]]+)?\]/.test(line)) {
      inOtel = true
      continue
    }
    if (inOtel && /^\[[^\]]+\]/.test(line)) {
      inOtel = false
    }
    if (!inOtel) {
      result.push(line)
    }
  }
  const trimmed = result.join('\n').trimEnd()
  return trimmed + newSection
}

const disconnectCodex = (configPath: string): ConnectResult => {
  try {
    if (!fs.existsSync(configPath)) {
      return { agent: 'codex', success: true, action: '설정 파일이 없어 건너뜀' }
    }
    const content = fs.readFileSync(configPath, 'utf-8')
    const lines = content.split('\n')
    const result: string[] = []
    let inOtel = false
    for (const line of lines) {
      if (/^\[otel(\.[^\]]+)?\]/.test(line)) {
        inOtel = true
        continue
      }
      if (inOtel && /^\[[^\]]+\]/.test(line)) {
        inOtel = false
      }
      if (!inOtel) {
        result.push(line)
      }
    }
    fs.writeFileSync(configPath, result.join('\n').trimEnd() + '\n', 'utf-8')
    return { agent: 'codex', success: true, action: 'OTel 섹션을 ~/.codex/config.toml에서 제거했다' }
  } catch (err) {
    return { agent: 'codex', success: false, action: '연결 해제 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

// Gemini

const getGeminiStatus = (configPath: string, defaultEndpoint: string): AgentStatus => {
  const installed = fs.existsSync(path.dirname(configPath))
  if (!fs.existsSync(configPath)) {
    return { type: 'gemini', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    const telemetry = data.telemetry as Record<string, unknown> | undefined
    const endpoint = (telemetry?.otlpEndpoint as string | undefined) ?? null
    const configured = endpoint === defaultEndpoint
    return { type: 'gemini', configPath, displayPath: toDisplayPath(configPath), installed, configured, endpoint }
  } catch {
    return { type: 'gemini', configPath, displayPath: toDisplayPath(configPath), installed, configured: false, endpoint: null }
  }
}

const connectGemini = (configPath: string, endpoint: string): ConnectResult => {
  try {
    let data: Record<string, unknown> = {}
    if (fs.existsSync(configPath)) {
      try {
        data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
      } catch {
        data = {}
      }
    } else {
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
    const existingTelemetry = (data.telemetry as Record<string, unknown> | undefined) ?? {}
    data.telemetry = { ...existingTelemetry, ...ARGUS_GEMINI_TELEMETRY(endpoint) }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return { agent: 'gemini', success: true, action: 'telemetry 설정을 ~/.gemini/settings.json에 병합했다' }
  } catch (err) {
    return { agent: 'gemini', success: false, action: '연결 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

const disconnectGemini = (configPath: string): ConnectResult => {
  try {
    if (!fs.existsSync(configPath)) {
      return { agent: 'gemini', success: true, action: '설정 파일이 없어 건너뜀' }
    }
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    } catch {
      return { agent: 'gemini', success: false, action: '연결 해제 실패', error: '설정 파일 파싱 오류' }
    }
    delete data.telemetry
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    return { agent: 'gemini', success: true, action: 'telemetry 키를 ~/.gemini/settings.json에서 제거했다' }
  } catch (err) {
    return { agent: 'gemini', success: false, action: '연결 해제 실패', error: err instanceof Error ? err.message : String(err) }
  }
}

// Public API

export const getSetupStatus = (endpoint = 'http://localhost:9845'): AgentStatus[] => {
  return [
    getClaudeStatus(AGENT_CONFIG_PATHS.claude, endpoint),
    getCodexStatus(AGENT_CONFIG_PATHS.codex, endpoint),
    getGeminiStatus(AGENT_CONFIG_PATHS.gemini, endpoint),
  ]
}

export const connectAgents = (agents: AgentSetupType[], endpoint: string): ConnectResult[] => {
  return agents.map((agent) => {
    const configPath = AGENT_CONFIG_PATHS[agent]
    switch (agent) {
      case 'claude':
        return connectClaude(configPath, endpoint)
      case 'codex':
        return connectCodex(configPath, endpoint)
      case 'gemini':
        return connectGemini(configPath, endpoint)
    }
  })
}

export const disconnectAgents = (agents: AgentSetupType[]): ConnectResult[] => {
  return agents.map((agent) => {
    const configPath = AGENT_CONFIG_PATHS[agent]
    switch (agent) {
      case 'claude':
        return disconnectClaude(configPath)
      case 'codex':
        return disconnectCodex(configPath)
      case 'gemini':
        return disconnectGemini(configPath)
    }
  })
}

export type { AgentSetupType, AgentStatus, ConnectResult }
