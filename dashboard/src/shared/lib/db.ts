import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.ARGUS_DB_PATH || path.join(process.cwd(), '..', 'argus.db')

let _db: Database.Database | null = null

export const getDb = (): Database.Database => {
  if (_db) return _db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  initSchema(_db)
  return _db
}

export const initSchema = (db: Database.Database) => {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_type ON agent_logs(agent_type);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agent_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_event_name ON agent_logs(event_name);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_date ON agent_logs(date(timestamp));
    CREATE INDEX IF NOT EXISTS idx_agent_logs_prompt_id ON agent_logs(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_project ON agent_logs(project_name);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_event_agent_ts ON agent_logs(event_name, agent_type, timestamp);
    CREATE INDEX IF NOT EXISTS idx_agent_logs_session_event ON agent_logs(session_id, event_name);

    CREATE TABLE IF NOT EXISTS pricing_model (
      model_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      input_per_mtok REAL NOT NULL,
      output_per_mtok REAL NOT NULL,
      cache_read_per_mtok REAL NOT NULL DEFAULT 0,
      cache_creation_per_mtok REAL NOT NULL DEFAULT 0,
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

    CREATE INDEX IF NOT EXISTS idx_config_snapshots_agent ON config_snapshots(agent_type, file_path, timestamp);

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
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_tool_details_timestamp ON tool_details(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tool_details_tool ON tool_details(tool_name, detail_name);
    CREATE INDEX IF NOT EXISTS idx_tool_details_session ON tool_details(session_id);

    CREATE TABLE IF NOT EXISTS project_registry (
      project_name TEXT PRIMARY KEY,
      project_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

  `)

  migrate(db)
  seedPricing(db)
}

const migrate = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `)

  const appliedVersions = new Set(
    (db.prepare('SELECT version FROM schema_version').all() as Array<{ version: number }>).map(r => r.version)
  )

  const run = (version: number, fn: () => void) => {
    if (appliedVersions.has(version)) return
    fn()
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version)
  }

  run(1, () => {
    const cols = db.prepare("PRAGMA table_info(agent_logs)").all() as Array<{ name: string }>
    const colNames = new Set(cols.map((c) => c.name))
    if (!colNames.has('reasoning_tokens')) {
      db.exec("ALTER TABLE agent_logs ADD COLUMN reasoning_tokens INTEGER NOT NULL DEFAULT 0")
    }
  })

  run(2, () => {
    const cols = db.prepare("PRAGMA table_info(agent_logs)").all() as Array<{ name: string }>
    const colNames = new Set(cols.map((c) => c.name))
    if (!colNames.has('project_name')) {
      db.exec("ALTER TABLE agent_logs ADD COLUMN project_name TEXT NOT NULL DEFAULT ''")
      db.exec("CREATE INDEX IF NOT EXISTS idx_agent_logs_project ON agent_logs(project_name)")
    }
  })

  run(3, () => {
    const tdCols = db.prepare("PRAGMA table_info(tool_details)").all() as Array<{ name: string }>
    const tdColNames = new Set(tdCols.map((c) => c.name))
    if (!tdColNames.has('agent_type')) {
      db.exec("ALTER TABLE tool_details ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'claude'")
      db.exec("UPDATE tool_details SET agent_type = 'codex' WHERE detail_type = 'codex-tool'")
      db.exec("UPDATE tool_details SET agent_type = 'gemini' WHERE detail_type = 'gemini-tool'")
    }
  })

  run(4, () => {
    db.exec(`DELETE FROM agent_logs WHERE event_name NOT IN (
      'api_request', 'user_prompt', 'tool_result', 'tool_decision',
      'session_start', 'api_error',
      'lines_of_code', 'commit_count', 'pull_request_count', 'active_time'
    )`)
  })

  run(5, () => {
    db.exec("DELETE FROM tool_details WHERE detail_type IN ('codex-tool', 'gemini-tool', 'tool-search')")
    db.exec("UPDATE tool_details SET detail_type = 'agent' WHERE detail_type NOT IN ('agent', 'skill', 'mcp') AND tool_name = 'Agent'")
    db.exec("UPDATE tool_details SET detail_type = 'skill' WHERE detail_type NOT IN ('agent', 'skill', 'mcp') AND tool_name = 'Skill'")
    db.exec("UPDATE tool_details SET detail_type = 'mcp' WHERE detail_type NOT IN ('agent', 'skill', 'mcp') AND tool_name LIKE 'mcp:%'")
  })

}

export const seedPricing = (db: Database.Database) => {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO pricing_model (model_id, agent_type, effective_date, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_creation_per_mtok) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const pricing = [
    ['claude-sonnet-4-20250514', 'claude', '2025-05-14', 3.0, 15.0, 0.3, 3.75],
    ['claude-sonnet-4-6', 'claude', '2025-05-14', 3.0, 15.0, 0.3, 3.75],
    ['claude-opus-4-20250514', 'claude', '2025-05-14', 15.0, 75.0, 1.5, 18.75],
    ['claude-opus-4-6', 'claude', '2025-05-14', 15.0, 75.0, 1.5, 18.75],
    ['claude-haiku-4-5-20251001', 'claude', '2025-10-01', 0.8, 4.0, 0.08, 1.0],
    // OpenAI / Codex models
    ['gpt-4.1', 'codex', '2025-04-14', 2.0, 8.0, 0.5, 0],
    ['gpt-4.1-mini', 'codex', '2025-04-14', 0.4, 1.6, 0.1, 0],
    ['gpt-4.1-nano', 'codex', '2025-04-14', 0.1, 0.4, 0.025, 0],
    ['o3', 'codex', '2025-04-16', 2.0, 8.0, 0.5, 0],
    ['o3-mini', 'codex', '2025-01-31', 1.1, 4.4, 0.275, 0],
    ['o4-mini', 'codex', '2025-04-16', 1.1, 4.4, 0.275, 0],
    ['codex-mini-latest', 'codex', '2025-05-16', 1.5, 6.0, 0.375, 0],
    ['gpt-5.4', 'codex', '2026-01-15', 2.0, 8.0, 0.5, 0],
    ['gpt-5.3-codex', 'codex', '2025-11-01', 1.5, 6.0, 0.375, 0],
    // Google Gemini models
    ['gemini-2.5-pro', 'gemini', '2025-06-01', 1.25, 10.0, 0.3125, 4.375],
    ['gemini-2.5-flash', 'gemini', '2025-06-01', 0.15, 0.6, 0.0375, 0.1],
    ['gemini-2.0-flash', 'gemini', '2025-02-01', 0.1, 0.4, 0.025, 0],
    ['gemini-2.0-flash-lite', 'gemini', '2025-02-01', 0.075, 0.3, 0.01875, 0],
  ] as const

  const tx = db.transaction(() => {
    for (const row of pricing) {
      insert.run(...row)
    }
  })
  tx()
}
