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
