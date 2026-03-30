#!/usr/bin/env node
/**
 * 스크린샷용 모킹 데이터 생성 스크립트
 *
 * 사용법:
 *   cd dashboard && node ../scripts/seed-mock.mjs
 *
 * 생성 위치: /tmp/argus-mock.db
 * 서버 연결: cd dashboard && ARGUS_DB_PATH=/tmp/argus-mock.db pnpm dev
 */
import { createRequire } from 'module'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const Database = require(path.join(__dirname, '..', 'dashboard', 'node_modules', 'better-sqlite3'))

const DB_PATH = '/tmp/argus-mock.db'

// ── helpers ──
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min, max) => Math.random() * (max - min) + min
const pick = (arr) => arr[rand(0, arr.length - 1)]
const uuid = () => randomUUID()

// ── 스키마 로드 ──

// DB 직접 초기화 (db.ts의 initSchema를 재현)
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    agent_type TEXT NOT NULL DEFAULT 'claude',
    service_name TEXT NOT NULL DEFAULT 'claude-code',
    event_name TEXT NOT NULL DEFAULT '',
    session_id TEXT NOT NULL DEFAULT '',
    prompt_id TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0.0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    speed TEXT NOT NULL DEFAULT 'normal',
    tool_name TEXT NOT NULL DEFAULT '',
    tool_success INTEGER,
    severity_text TEXT NOT NULL DEFAULT 'INFO',
    body TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    resource_attributes TEXT NOT NULL DEFAULT '{}',
    log_attributes TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_logs_ts ON agent_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_logs_agent ON agent_logs(agent_type);
  CREATE INDEX IF NOT EXISTS idx_logs_session ON agent_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_logs_event ON agent_logs(event_name);
  CREATE INDEX IF NOT EXISTS idx_logs_date ON agent_logs(date(timestamp));
  CREATE INDEX IF NOT EXISTS idx_logs_prompt ON agent_logs(prompt_id);
  CREATE INDEX IF NOT EXISTS idx_logs_project ON agent_logs(project_name);

  CREATE TABLE IF NOT EXISTS pricing_model (
    model_id TEXT NOT NULL,
    agent_type TEXT NOT NULL DEFAULT 'claude',
    effective_date TEXT NOT NULL DEFAULT '2025-01-01',
    input_per_mtok REAL NOT NULL DEFAULT 0.0,
    output_per_mtok REAL NOT NULL DEFAULT 0.0,
    cache_read_per_mtok REAL NOT NULL DEFAULT 0.0,
    cache_creation_per_mtok REAL NOT NULL DEFAULT 0.0,
    PRIMARY KEY (model_id, effective_date)
  );

  CREATE TABLE IF NOT EXISTS config_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    agent_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_config_agent_file_ts ON config_snapshots(agent_type, file_path, timestamp);

  CREATE TABLE IF NOT EXISTS tool_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    session_id TEXT NOT NULL DEFAULT '',
    tool_name TEXT NOT NULL DEFAULT '',
    detail_name TEXT NOT NULL DEFAULT '',
    detail_type TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    success INTEGER,
    project_name TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    agent_type TEXT NOT NULL DEFAULT 'claude'
  );
  CREATE INDEX IF NOT EXISTS idx_td_ts ON tool_details(timestamp);
  CREATE INDEX IF NOT EXISTS idx_td_tool ON tool_details(tool_name, detail_name);
  CREATE INDEX IF NOT EXISTS idx_td_session ON tool_details(session_id);

  CREATE TABLE IF NOT EXISTS project_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL UNIQUE,
    project_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`)

// ── 설정 ──
const DAYS = 120 // 히트맵 16주(112일) 커버 + 여유
const PROJECTS = ['argus', 'web-app', 'api-server', 'mobile-app', 'data-pipeline']

const AGENT_CONFIGS = [
  {
    agentType: 'claude',
    serviceName: 'claude-code',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'],
    costRange: [0.005, 1.5],
    toolNames: ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep', 'Agent', 'Skill'],
    sessionsRange: [2, 8],
    weight: 0.55, // Claude가 주 사용 에이전트
  },
  {
    agentType: 'codex',
    serviceName: 'codex_cli_rs',
    models: ['gpt-5.4', 'gpt-4.1', 'o4-mini'],
    costRange: [0.002, 0.8],
    toolNames: ['shell', 'read_file', 'write_file', 'patch_file', 'list_directory'],
    sessionsRange: [1, 5],
    weight: 0.25,
  },
  {
    agentType: 'gemini',
    serviceName: 'gemini-cli',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    costRange: [0.001, 0.08],
    toolNames: ['shell', 'read_file', 'write_file', 'edit_file', 'glob', 'grep', 'web_search'],
    sessionsRange: [1, 4],
    weight: 0.20,
  },
]

const ORCHESTRATION = {
  claude: {
    agents: ['general-purpose', 'code-reviewer', 'plan-writer', 'page-builder', 'infra-builder'],
    skills: ['commit', 'review-pr', 'feature-start', 'feature-finish', 'simplify', 'spec'],
    mcpServers: {
      linear: ['mcp__linear__save_issue', 'mcp__linear__list_issues', 'mcp__linear__get_issue'],
      slack: ['mcp__slack__send_message', 'mcp__slack__list_channels'],
    },
  },
  codex: {
    mcpServers: {
      linear: ['mcp__linear__save_issue', 'mcp__linear__list_issues'],
      github: ['mcp__github__create_pr', 'mcp__github__list_prs'],
    },
  },
  gemini: {
    mcpServers: {
      linear: ['mcp__linear__get_issue', 'mcp__linear__save_comment'],
      supabase: ['mcp__supabase__query', 'mcp__supabase__insert'],
    },
  },
}

// ── 준비된 구문 ──
const insertLog = db.prepare(`
  INSERT INTO agent_logs (
    timestamp, agent_type, service_name, event_name, session_id, prompt_id,
    model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
    reasoning_tokens, cost_usd, duration_ms, speed, tool_name, tool_success,
    project_name, severity_text, body
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INFO', ?)
`)

const insertToolDetail = db.prepare(`
  INSERT INTO tool_details (
    timestamp, session_id, tool_name, detail_name, detail_type,
    duration_ms, success, project_name, metadata, agent_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
`)

// ── 데이터 생성 ──
console.log(`🔧 모킹 DB 생성: ${DB_PATH}`)
console.log(`📅 ${DAYS}일치 데이터 생성 중...`)

let logCount = 0
let toolDetailCount = 0

// 주말 효과: 주말에는 사용량 감소
const weekendFactor = (date) => {
  const day = date.getDay()
  return (day === 0 || day === 6) ? 0.3 : 1.0
}

// 시간대 트렌드: 최근으로 올수록 사용량 증가 (성장 곡선)
const growthFactor = (dayOffset) => {
  const progress = 1 - dayOffset / DAYS
  return 0.3 + progress * 0.7 // 30% → 100%
}

const tx = db.transaction(() => {
  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - dayOffset)
    baseDate.setHours(0, 0, 0, 0)

    const wFactor = weekendFactor(baseDate)
    const gFactor = growthFactor(dayOffset)

    for (const config of AGENT_CONFIGS) {
      // 일별 세션 수 (주말/성장 반영)
      const baseSessions = rand(config.sessionsRange[0], config.sessionsRange[1])
      const sessionsToday = Math.max(1, Math.round(baseSessions * wFactor * gFactor))

      // 에이전트별 휴일 확률 — 현실적인 빈틈 생성
      // Claude: 평일 15%, 주말 50% 확률로 쉼
      // Codex: 평일 35%, 주말 70% 확률로 쉼
      // Gemini: 평일 40%, 주말 75% 확률로 쉼
      const isWeekend = wFactor < 1
      const skipChance = {
        claude: isWeekend ? 0.50 : 0.15,
        codex:  isWeekend ? 0.70 : 0.35,
        gemini: isWeekend ? 0.75 : 0.40,
      }[config.agentType]
      // 오늘(dayOffset=0)은 반드시 데이터 생성
      if (dayOffset > 0 && Math.random() < skipChance) continue

      for (let s = 0; s < sessionsToday; s++) {
        const sessionId = uuid()
        const projectName = pick(PROJECTS)
        const promptsPerSession = rand(3, 20)
        const sessionModel = pick(config.models)

        for (let p = 0; p < promptsPerSession; p++) {
          const promptId = uuid()
          const date = new Date(baseDate)
          // 오늘이면 현재 시각 - 5분까지만 생성 (미래 타임스탬프 방지)
          const now = new Date()
          const maxHour = dayOffset === 0 ? Math.max(8, now.getHours() - 1) : 22
          const minHour = Math.min(8, maxHour)
          date.setHours(rand(minHour, maxHour), rand(0, 59), rand(0, 59))
          if (dayOffset === 0 && date > now) {
            date.setTime(now.getTime() - rand(60000, 3600000)) // 1분~1시간 전
          }
          const ts = date.toISOString()

          // user_prompt
          insertLog.run(
            ts, config.agentType, config.serviceName, 'user_prompt',
            sessionId, promptId, '', 0, 0, 0, 0, 0, 0, 0, 'normal', '', null,
            projectName, 'User prompt'
          )
          logCount++

          // api_request(s)
          const apiCalls = rand(1, 3)
          for (let a = 0; a < apiCalls; a++) {
            const model = Math.random() > 0.3 ? sessionModel : pick(config.models)
            const inputTokens = rand(2000, 80000)
            const outputTokens = rand(200, 8000)
            const cacheRead = rand(0, Math.floor(inputTokens * 0.7))
            const cacheCreation = rand(0, 500)
            const reasoning = model.includes('opus') || model.includes('o4') ? rand(500, 5000) : 0
            const cost = randFloat(config.costRange[0], config.costRange[1])
            const duration = rand(500, 15000)
            const speed = Math.random() > 0.7 ? 'fast' : 'normal'

            let apiDate = new Date(date.getTime() + rand(1000, 30000))
            if (apiDate > now) apiDate = new Date(now.getTime() - rand(10000, 300000))
            insertLog.run(
              apiDate.toISOString(), config.agentType, config.serviceName,
              'api_request', sessionId, promptId, model,
              inputTokens, outputTokens, cacheRead, cacheCreation, reasoning,
              Math.round(cost * 10000) / 10000, duration, speed, '', null,
              projectName, ''
            )
            logCount++
          }

          // tool_result(s)
          const toolCount = rand(0, 4)
          for (let t = 0; t < toolCount; t++) {
            let toolDate = new Date(date.getTime() + rand(30000, 60000))
            if (toolDate > now) toolDate = new Date(now.getTime() - rand(10000, 300000))
            const toolName = pick(config.toolNames)
            const success = Math.random() > 0.08 ? 1 : 0
            insertLog.run(
              toolDate.toISOString(), config.agentType, config.serviceName,
              'tool_result', sessionId, promptId, '', 0, 0, 0, 0, 0, 0,
              rand(50, 5000), 'normal', toolName, success,
              projectName, ''
            )
            logCount++
          }
        }
      }

      // Orchestration tool_details
      const orchConfig = ORCHESTRATION[config.agentType]
      if (orchConfig.agents) {
        for (let i = 0; i < rand(1, 4); i++) {
          const orchDate = new Date(Math.min(baseDate.getTime() + rand(0, 86400000), Date.now() - rand(60000, 600000)))
          const ts = orchDate.toISOString()
          insertToolDetail.run(ts, uuid(), 'Agent', pick(orchConfig.agents), 'agent', rand(1000, 30000), 1, pick(PROJECTS), config.agentType)
          toolDetailCount++
        }
      }
      if (orchConfig.skills) {
        for (let i = 0; i < rand(0, 3); i++) {
          const orchDate = new Date(Math.min(baseDate.getTime() + rand(0, 86400000), Date.now() - rand(60000, 600000)))
          const ts = orchDate.toISOString()
          insertToolDetail.run(ts, uuid(), 'Skill', pick(orchConfig.skills), 'skill', rand(500, 5000), 1, pick(PROJECTS), config.agentType)
          toolDetailCount++
        }
      }
      for (const [server, tools] of Object.entries(orchConfig.mcpServers)) {
        for (let i = 0; i < rand(0, 3); i++) {
          const orchDate = new Date(Math.min(baseDate.getTime() + rand(0, 86400000), Date.now() - rand(60000, 600000)))
          const ts = orchDate.toISOString()
          insertToolDetail.run(ts, uuid(), `mcp:${server}`, pick(tools), 'mcp', rand(200, 3000), Math.random() > 0.1 ? 1 : 0, pick(PROJECTS), config.agentType)
          toolDetailCount++
        }
      }
    }
  }

  // ── 활성 세션 (지금으로부터 2~3분 전 데이터) ──
  console.log('⚡ 활성 세션 생성 중...')
  const activeConfigs = [
    { agent: AGENT_CONFIGS[0], model: 'claude-sonnet-4-20250514', project: 'argus' },
    { agent: AGENT_CONFIGS[2], model: 'gemini-2.5-pro', project: 'web-app' },
  ]
  for (const { agent, model, project } of activeConfigs) {
    const sessionId = uuid()
    for (let p = 0; p < 3; p++) {
      const promptId = uuid()
      const now = new Date()
      now.setMinutes(now.getMinutes() - rand(1, 3))
      now.setSeconds(rand(0, 59))

      insertLog.run(
        now.toISOString(), agent.agentType, agent.serviceName, 'user_prompt',
        sessionId, promptId, '', 0, 0, 0, 0, 0, 0, 0, 'normal', '', null,
        project, 'User prompt'
      )
      logCount++

      const apiDate = new Date(now.getTime() + rand(1000, 5000))
      insertLog.run(
        apiDate.toISOString(), agent.agentType, agent.serviceName,
        'api_request', sessionId, promptId, model,
        rand(5000, 30000), rand(500, 3000), rand(2000, 15000), 0, 0,
        randFloat(0.01, 0.3), rand(1000, 5000), 'normal', '', null,
        project, ''
      )
      logCount++
    }
  }

  // ── 프로젝트 레지스트리 ──
  const insertRegistry = db.prepare(`
    INSERT OR REPLACE INTO project_registry (project_name, project_path) VALUES (?, ?)
  `)
  insertRegistry.run('argus', '/Users/demo/code/argus')
  insertRegistry.run('web-app', '/Users/demo/code/web-app')
  insertRegistry.run('api-server', '/Users/demo/code/api-server')
  insertRegistry.run('mobile-app', '/Users/demo/code/mobile-app')
  insertRegistry.run('data-pipeline', '/Users/demo/code/data-pipeline')

  // ── 가격 데이터 시드 ──
  const insertPricing = db.prepare(`
    INSERT OR REPLACE INTO pricing_model (model_id, agent_type, effective_date, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_creation_per_mtok)
    VALUES (?, ?, '2025-01-01', ?, ?, ?, ?)
  `)
  // Claude
  insertPricing.run('claude-sonnet-4-20250514', 'claude', 3, 15, 0.3, 3.75)
  insertPricing.run('claude-opus-4-20250514', 'claude', 15, 75, 1.5, 18.75)
  insertPricing.run('claude-haiku-4-5-20251001', 'claude', 0.8, 4, 0.08, 1)
  // Codex / OpenAI
  insertPricing.run('gpt-5.4', 'codex', 2.5, 10, 0, 0)
  insertPricing.run('gpt-4.1', 'codex', 2, 8, 0, 0)
  insertPricing.run('o4-mini', 'codex', 1.1, 4.4, 0, 0)
  // Gemini
  insertPricing.run('gemini-2.5-pro', 'gemini', 1.25, 10, 0, 0)
  insertPricing.run('gemini-2.5-flash', 'gemini', 0.15, 0.6, 0, 0)
  insertPricing.run('gemini-2.0-flash', 'gemini', 0.1, 0.4, 0, 0)
})

tx()

console.log(`✅ 완료!`)
console.log(`   📊 agent_logs: ${logCount.toLocaleString()}행`)
console.log(`   🔧 tool_details: ${toolDetailCount.toLocaleString()}행`)
console.log(`   📁 DB 경로: ${DB_PATH}`)
console.log('')
console.log(`🚀 서버 시작:`)
console.log(`   cd dashboard && ARGUS_DB_PATH=${DB_PATH} pnpm dev`)

db.close()
