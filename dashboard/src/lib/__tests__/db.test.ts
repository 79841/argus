import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'

const createDb = () => {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

describe('initSchema', () => {
  it('필수 테이블을 생성한다', () => {
    const db = createDb()
    initSchema(db)

    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map(r => r.name)

    expect(tables).toContain('agent_logs')
    expect(tables).toContain('pricing_model')
    expect(tables).toContain('config_snapshots')
    expect(tables).toContain('tool_details')
    expect(tables).toContain('agent_limits')
    expect(tables).toContain('project_registry')
  })

  it('agent_logs 테이블의 필수 컬럼이 존재한다', () => {
    const db = createDb()
    initSchema(db)

    const cols = (db.prepare("PRAGMA table_info(agent_logs)").all() as Array<{ name: string }>).map(c => c.name)

    expect(cols).toContain('id')
    expect(cols).toContain('timestamp')
    expect(cols).toContain('agent_type')
    expect(cols).toContain('event_name')
    expect(cols).toContain('session_id')
    expect(cols).toContain('prompt_id')
    expect(cols).toContain('model')
    expect(cols).toContain('input_tokens')
    expect(cols).toContain('output_tokens')
    expect(cols).toContain('cache_read_tokens')
    expect(cols).toContain('cache_creation_tokens')
    expect(cols).toContain('reasoning_tokens')
    expect(cols).toContain('cost_usd')
    expect(cols).toContain('duration_ms')
    expect(cols).toContain('tool_name')
    expect(cols).toContain('tool_success')
    expect(cols).toContain('project_name')
  })

  it('tool_details 테이블의 필수 컬럼이 존재한다', () => {
    const db = createDb()
    initSchema(db)

    const cols = (db.prepare("PRAGMA table_info(tool_details)").all() as Array<{ name: string }>).map(c => c.name)

    expect(cols).toContain('id')
    expect(cols).toContain('session_id')
    expect(cols).toContain('tool_name')
    expect(cols).toContain('detail_name')
    expect(cols).toContain('detail_type')
    expect(cols).toContain('agent_type')
    expect(cols).toContain('duration_ms')
    expect(cols).toContain('success')
  })

  it('pricing_model 테이블에 기본 가격 데이터가 시드된다', () => {
    const db = createDb()
    initSchema(db)

    const count = (db.prepare("SELECT count(*) as cnt FROM pricing_model").get() as { cnt: number }).cnt
    expect(count).toBeGreaterThan(0)
  })

  it('idempotent하다 — 반복 호출 시 오류가 없다', () => {
    const db = createDb()
    expect(() => {
      initSchema(db)
      initSchema(db)
      initSchema(db)
    }).not.toThrow()
  })

  it('agent_limits 테이블에 데이터를 삽입할 수 있다', () => {
    const db = createDb()
    initSchema(db)

    db.prepare("INSERT INTO agent_limits (agent_type, daily_cost_limit, monthly_cost_limit) VALUES (?, ?, ?)").run('claude', 10.0, 200.0)

    const row = db.prepare("SELECT * FROM agent_limits WHERE agent_type = 'claude'").get() as { daily_cost_limit: number } | undefined
    expect(row).toBeDefined()
    expect(row!.daily_cost_limit).toBe(10.0)
  })

  it('인덱스가 생성된다', () => {
    const db = createDb()
    initSchema(db)

    const indexes = (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>).map(r => r.name)

    expect(indexes).toContain('idx_agent_logs_timestamp')
    expect(indexes).toContain('idx_agent_logs_agent_type')
    expect(indexes).toContain('idx_agent_logs_session_id')
    expect(indexes).toContain('idx_agent_logs_event_name')
  })
})
