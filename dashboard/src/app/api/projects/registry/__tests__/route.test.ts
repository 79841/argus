import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '@/shared/lib/db'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

let testDb: Database.Database

vi.mock('@/shared/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/lib/db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

const { GET, POST, DELETE } = await import('../route')

let tmpDir: string

beforeEach(() => {
  testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  initSchema(testDb)
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'argus-test-'))
})

afterEach(() => {
  testDb.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const mkPostRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/projects/registry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const mkDeleteRequest = (name?: string) => {
  const url = name
    ? `http://localhost/api/projects/registry?name=${encodeURIComponent(name)}`
    : 'http://localhost/api/projects/registry'
  return new NextRequest(url, { method: 'DELETE' })
}

describe('GET /api/projects/registry', () => {
  it('빈 레지스트리 → 빈 배열 반환', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.projects).toEqual([])
  })

  it('등록된 프로젝트 반환', async () => {
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('test', '/tmp/test')
    const res = await GET()
    const json = await res.json()
    expect(json.projects).toHaveLength(1)
    expect(json.projects[0].project_name).toBe('test')
  })
})

describe('POST /api/projects/registry', () => {
  it('프로젝트 등록 성공', async () => {
    const res = await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('등록 시 .claude/settings.json에 OTEL_RESOURCE_ATTRIBUTES 자동 설정', async () => {
    await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json')
    expect(fs.existsSync(settingsPath)).toBe(true)
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(data.env.OTEL_RESOURCE_ATTRIBUTES).toBe('project.name=my-proj')
  })

  it('기존 .claude/settings.json이 있으면 병합', async () => {
    const claudeDir = path.join(tmpDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ env: { EXISTING_KEY: 'value' } }))

    await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))
    const data = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8'))
    expect(data.env.EXISTING_KEY).toBe('value')
    expect(data.env.OTEL_RESOURCE_ATTRIBUTES).toBe('project.name=my-proj')
  })

  it('name 또는 path 누락 시 400', async () => {
    const res = await POST(mkPostRequest({ name: '' }))
    expect(res.status).toBe(400)
  })

  it('존재하지 않는 경로 → 400', async () => {
    const res = await POST(mkPostRequest({ name: 'proj', path: '/nonexistent-path-xyz' }))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/projects/registry', () => {
  it('프로젝트 삭제 성공', async () => {
    // 먼저 등록
    await POST(mkPostRequest({ name: 'del-proj', path: tmpDir }))
    const res = await DELETE(mkDeleteRequest('del-proj'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // 레지스트리에서 삭제 확인
    const getRes = await GET()
    const getJson = await getRes.json()
    expect(getJson.projects).toHaveLength(0)
  })

  it('삭제 시 .claude/settings.json에서 OTEL_RESOURCE_ATTRIBUTES 제거', async () => {
    await POST(mkPostRequest({ name: 'del-proj', path: tmpDir }))
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json')
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf-8')).env.OTEL_RESOURCE_ATTRIBUTES).toBe('project.name=del-proj')

    await DELETE(mkDeleteRequest('del-proj'))
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(data.env).toBeUndefined()
  })

  it('삭제 시 기존 env 키는 유지', async () => {
    // settings.json에 기존 키가 있는 상태에서 등록 후 삭제
    const claudeDir = path.join(tmpDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ env: { KEEP_ME: '1' } }))

    await POST(mkPostRequest({ name: 'del-proj', path: tmpDir }))
    await DELETE(mkDeleteRequest('del-proj'))

    const data = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8'))
    expect(data.env.KEEP_ME).toBe('1')
    expect(data.env.OTEL_RESOURCE_ATTRIBUTES).toBeUndefined()
  })

  it('name 누락 시 400', async () => {
    const res = await DELETE(mkDeleteRequest())
    expect(res.status).toBe(400)
  })
})

describe('기존 세션 backfill', () => {
  it('프로젝트 등록 시 매칭되는 기존 세션의 project_name을 backfill', async () => {
    // 기존 세션 데이터 삽입 (project_name 비어있음, log_attributes에 파일 경로 포함)
    testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, model,
        input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name, log_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(), 'claude', 'tool_result', 'sess-old', '', 0, 0, 0, 0, 0, 0, 100,
      'Read', 1, '',
      JSON.stringify({ 'tool_parameters': JSON.stringify({ file_path: `${tmpDir}/src/app.ts` }) })
    )

    // 같은 세션의 api_request (파일 경로 없음)
    testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, model,
        input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name, log_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(), 'claude', 'api_request', 'sess-old', 'claude-sonnet-4-6',
      100, 50, 0, 0, 0, 0.01, 1000, '', null, '', '{}'
    )

    // 프로젝트 등록
    const res = await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))
    const json = await res.json()
    expect(json.backfilled).toBe(1)

    // 기존 세션의 모든 이벤트가 backfill되었는지 확인
    const logs = testDb.prepare("SELECT project_name FROM agent_logs WHERE session_id = 'sess-old'").all() as { project_name: string }[]
    expect(logs).toHaveLength(2)
    expect(logs[0].project_name).toBe('my-proj')
    expect(logs[1].project_name).toBe('my-proj')
  })

  it('매칭되지 않는 세션은 backfill하지 않음', async () => {
    testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, model,
        input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name, log_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(), 'claude', 'tool_result', 'sess-other', '', 0, 0, 0, 0, 0, 0, 100,
      'Read', 1, '',
      JSON.stringify({ 'tool_parameters': JSON.stringify({ file_path: '/other/path/src/app.ts' }) })
    )

    await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))

    const logs = testDb.prepare("SELECT project_name FROM agent_logs WHERE session_id = 'sess-other'").all() as { project_name: string }[]
    expect(logs[0].project_name).toBe('')
  })

  it('이미 project_name이 있는 이벤트는 덮어쓰지 않음', async () => {
    testDb.prepare(`
      INSERT INTO agent_logs (timestamp, agent_type, event_name, session_id, model,
        input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        reasoning_tokens, cost_usd, duration_ms, tool_name, tool_success, project_name, log_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(), 'claude', 'tool_result', 'sess-existing', '', 0, 0, 0, 0, 0, 0, 100,
      'Read', 1, 'other-proj',
      JSON.stringify({ 'tool_parameters': JSON.stringify({ file_path: `${tmpDir}/src/app.ts` }) })
    )

    await POST(mkPostRequest({ name: 'my-proj', path: tmpDir }))

    const logs = testDb.prepare("SELECT project_name FROM agent_logs WHERE session_id = 'sess-existing'").all() as { project_name: string }[]
    expect(logs[0].project_name).toBe('other-proj')
  })
})
