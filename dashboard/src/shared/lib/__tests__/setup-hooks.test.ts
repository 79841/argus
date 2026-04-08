import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { connectHooks, disconnectHooks, getHooksStatus } from '@/shared/lib/setup-hooks'

const ARGUS_HOOK_MARKER = '/api/hooks'

const makeTmpDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argus-hooks-test-'))
  return dir
}

const settingsPath = (projectDir: string) => path.join(projectDir, '.claude', 'settings.json')

const readSettings = (projectDir: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(settingsPath(projectDir), 'utf-8')) as Record<string, unknown>

describe('connectHooks', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = makeTmpDir()
  })

  it('새 프로젝트에 Hook을 설정하면 4개 이벤트가 모두 등록된다', () => {
    const result = connectHooks(tmpDir)

    expect(result.success).toBe(true)
    expect(result.action).toBe('connected')

    const data = readSettings(tmpDir)
    const hooks = data.hooks as Record<string, unknown[]>
    expect(hooks).toBeDefined()

    for (const event of ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop']) {
      const entries = hooks[event] as Array<{ hooks?: Array<{ command?: string }> }>
      expect(entries).toBeDefined()
      expect(entries.length).toBeGreaterThan(0)
      const hasArgus = entries.some(e => e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER)))
      expect(hasArgus).toBe(true)
    }
  })

  it('기존 설정이 있는 프로젝트에서 기존 훅을 보존하고 Argus 훅만 추가한다', () => {
    const dir = path.join(tmpDir, '.claude')
    fs.mkdirSync(dir, { recursive: true })
    const existing = {
      hooks: {
        PreToolUse: [
          { matcher: 'OtherTool', hooks: [{ type: 'command', command: 'echo other-hook' }] },
        ],
      },
    }
    fs.writeFileSync(settingsPath(tmpDir), JSON.stringify(existing, null, 2), 'utf-8')

    connectHooks(tmpDir)

    const data = readSettings(tmpDir)
    const hooks = data.hooks as Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>

    const preToolUse = hooks['PreToolUse']
    expect(preToolUse.length).toBe(2)

    const otherHook = preToolUse.find(e => e.hooks?.some(h => h.command === 'echo other-hook'))
    expect(otherHook).toBeDefined()

    const argusHook = preToolUse.find(e => e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER)))
    expect(argusHook).toBeDefined()
  })

  it('이미 Argus 훅이 있으면 중복 추가하지 않는다', () => {
    connectHooks(tmpDir)
    connectHooks(tmpDir)

    const data = readSettings(tmpDir)
    const hooks = data.hooks as Record<string, unknown[]>

    for (const event of ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop']) {
      const entries = hooks[event] as Array<{ hooks?: Array<{ command?: string }> }>
      const argusCount = entries.filter(e => e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER))).length
      expect(argusCount).toBe(1)
    }
  })

  it('커스텀 endpoint를 지정하면 해당 endpoint로 curl 명령이 생성된다', () => {
    connectHooks(tmpDir, 'http://localhost:3000')

    const data = readSettings(tmpDir)
    const hooks = data.hooks as Record<string, Array<{ hooks?: Array<{ command?: string }> }>>
    const preToolUse = hooks['PreToolUse']
    const argusHook = preToolUse.find(e => e.hooks?.some(h => h.command?.includes('localhost:3000')))
    expect(argusHook).toBeDefined()
  })
})

describe('disconnectHooks', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = makeTmpDir()
  })

  it('Argus 훅만 제거하고 다른 훅은 보존한다', () => {
    const dir = path.join(tmpDir, '.claude')
    fs.mkdirSync(dir, { recursive: true })
    const existing = {
      hooks: {
        PreToolUse: [
          { matcher: 'OtherTool', hooks: [{ type: 'command', command: 'echo other' }] },
        ],
      },
    }
    fs.writeFileSync(settingsPath(tmpDir), JSON.stringify(existing, null, 2), 'utf-8')

    connectHooks(tmpDir)
    disconnectHooks(tmpDir)

    const data = readSettings(tmpDir)
    const hooks = data.hooks as Record<string, Array<{ hooks?: Array<{ command?: string }> }>>

    const preToolUse = hooks?.['PreToolUse'] ?? []
    const hasArgus = preToolUse.some(e => e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER)))
    expect(hasArgus).toBe(false)

    const hasOther = preToolUse.some(e => e.hooks?.some(h => h.command === 'echo other'))
    expect(hasOther).toBe(true)
  })

  it('훅이 모두 제거되면 hooks 키도 삭제한다', () => {
    connectHooks(tmpDir)
    disconnectHooks(tmpDir)

    const data = readSettings(tmpDir)
    expect(data.hooks).toBeUndefined()
  })

  it('settings.json이 없으면 already_disconnected를 반환한다', () => {
    const result = disconnectHooks(tmpDir)
    expect(result.success).toBe(true)
    expect(result.action).toBe('already_disconnected')
  })
})

describe('getHooksStatus', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = makeTmpDir()
  })

  it('settings.json이 없으면 connected: false, hookCount: 0을 반환한다', () => {
    const status = getHooksStatus(tmpDir)
    expect(status.connected).toBe(false)
    expect(status.hookCount).toBe(0)
  })

  it('4개 이벤트 모두 연결되면 connected: true, hookCount: 4를 반환한다', () => {
    connectHooks(tmpDir)
    const status = getHooksStatus(tmpDir)
    expect(status.connected).toBe(true)
    expect(status.hookCount).toBe(4)
  })

  it('일부 이벤트만 있으면 connected: false를 반환한다', () => {
    const dir = path.join(tmpDir, '.claude')
    fs.mkdirSync(dir, { recursive: true })
    const partial = {
      hooks: {
        PreToolUse: [
          { matcher: 'Agent', hooks: [{ type: 'command', command: `curl -sf -X POST http://localhost:9845/api/hooks -H "Content-Type: application/json" -d @- > /dev/null 2>&1 || true` }] },
        ],
      },
    }
    fs.writeFileSync(settingsPath(tmpDir), JSON.stringify(partial, null, 2), 'utf-8')

    const status = getHooksStatus(tmpDir)
    expect(status.connected).toBe(false)
    expect(status.hookCount).toBe(1)
  })

  it('연결 후 해제하면 connected: false를 반환한다', () => {
    connectHooks(tmpDir)
    disconnectHooks(tmpDir)
    const status = getHooksStatus(tmpDir)
    expect(status.connected).toBe(false)
    expect(status.hookCount).toBe(0)
  })
})
