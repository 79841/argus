import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { normalizePath, isPathSafe, scanDirFiles } from '../config-scanner'

describe('normalizePath', () => {
  it('비-Windows 플랫폼에서 경로를 그대로 반환한다', () => {
    const result = normalizePath('/Users/test/project')
    expect(result).toBe('/Users/test/project')
  })
})

describe('isPathSafe', () => {
  it('500자 이상 경로에 대해 false를 반환한다', () => {
    const longPath = '~/' + 'a'.repeat(500)
    expect(isPathSafe(longPath)).toBe(false)
  })

  it('홈 디렉토리 하위 ~/경로에 대해 true를 반환한다', () => {
    const home = os.homedir()
    const testPath = '~/some/safe/path'
    expect(isPathSafe(testPath)).toBe(true)
    // Verify it resolves under home
    const resolved = path.join(home, 'some/safe/path')
    expect(resolved.startsWith(home)).toBe(true)
  })

  it('projectRoot 없이 상대 경로에 대해 false를 반환한다', () => {
    expect(isPathSafe('relative/path/file.ts')).toBe(false)
    expect(isPathSafe('./some/file.ts')).toBe(false)
  })

  it('projectRoot 하위 경로에 대해 true를 반환한다', () => {
    const projectRoot = os.tmpdir()
    const result = isPathSafe('subdir/file.ts', projectRoot)
    expect(result).toBe(true)
  })
})

describe('scanDirFiles', () => {
  let tmpDir: string | undefined

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      tmpDir = undefined
    }
  })

  it('존재하지 않는 디렉토리에서 빈 배열을 반환한다', () => {
    const result = scanDirFiles('/nonexistent/path/12345', '.md', 'claude', '.claude/rules')
    expect(result).toEqual([])
  })

  it('매칭 파일을 올바른 agent와 prefix로 반환한다', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scandir-test-'))
    fs.writeFileSync(path.join(tmpDir, 'rule1.md'), 'content')
    fs.writeFileSync(path.join(tmpDir, 'rule2.md'), 'content')
    fs.writeFileSync(path.join(tmpDir, 'ignore.txt'), 'content')

    const result = scanDirFiles(tmpDir, '.md', 'claude', '.claude/rules')

    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ agent: 'claude', path: '.claude/rules/rule1.md' })
    expect(result).toContainEqual({ agent: 'claude', path: '.claude/rules/rule2.md' })
  })

  it('확장자로 필터링한다', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scandir-ext-'))
    fs.writeFileSync(path.join(tmpDir, 'config.rules'), 'content')
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), 'content')

    const result = scanDirFiles(tmpDir, '.rules', 'codex', '.codex/rules')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ agent: 'codex', path: '.codex/rules/config.rules' })
  })
})
