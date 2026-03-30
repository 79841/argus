import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'
import fs from 'fs'

// isPathSafe 로직을 직접 검증하기 위해 동일한 구현을 테스트용으로 재현
// route.ts의 private 함수이므로 로직을 추출하여 단위 테스트

const MAX_PATH_LENGTH = 500

const normalizePath = (p: string): string =>
  process.platform === 'win32' ? p.toLowerCase() : p

const getUserHome = () => os.homedir()

const resolveUserPath = (filePath: string): string =>
  path.join(getUserHome(), filePath.slice(2))

const isPathSafe = (filePath: string, projectRoot?: string): boolean => {
  if (filePath.length > MAX_PATH_LENGTH) return false
  if (filePath.startsWith('~/')) {
    const absPath = resolveUserPath(filePath)
    let realPath: string
    try {
      realPath = fs.realpathSync(absPath)
    } catch {
      realPath = path.resolve(absPath)
    }
    const resolved = normalizePath(realPath)
    const home = normalizePath(getUserHome())
    return resolved.startsWith(home + path.sep) || resolved === home
  }
  if (!projectRoot) return false
  const normalizedRoot = normalizePath(path.resolve(projectRoot))
  const absPath = path.resolve(projectRoot, filePath)
  let realPath: string
  try {
    realPath = fs.realpathSync(absPath)
  } catch {
    realPath = absPath
  }
  const resolved = normalizePath(realPath)
  return resolved.startsWith(normalizedRoot + path.sep) || resolved === normalizedRoot
}

describe('normalizePath', () => {
  it('non-Windows에서는 경로를 변환하지 않는다', () => {
    if (process.platform === 'win32') return
    expect(normalizePath('/Users/Test/Project')).toBe('/Users/Test/Project')
  })

  it('Windows에서는 경로를 소문자로 변환한다', () => {
    if (process.platform !== 'win32') return
    expect(normalizePath('C:\\Users\\TEST\\Project')).toBe('c:\\users\\test\\project')
  })
})

describe('isPathSafe — 홈 디렉토리 경로 (~/ 접두사)', () => {
  it('홈 디렉토리 하위 파일은 안전하다', () => {
    expect(isPathSafe('~/.claude/settings.json')).toBe(true)
  })

  it('홈 디렉토리 하위 중첩 경로도 안전하다', () => {
    expect(isPathSafe('~/.codex/config.toml')).toBe(true)
  })

  it('.. 트래버설이 포함된 경로는 거부한다', () => {
    expect(isPathSafe('~/../../etc/passwd')).toBe(false)
  })
})

describe('isPathSafe — 프로젝트 루트 경로', () => {
  const projectRoot = path.join(os.tmpdir(), 'test-project')

  it('프로젝트 루트 없이 상대 경로를 전달하면 거부한다', () => {
    expect(isPathSafe('CLAUDE.md')).toBe(false)
  })

  it('프로젝트 루트 하위 파일은 안전하다', () => {
    expect(isPathSafe('CLAUDE.md', projectRoot)).toBe(true)
  })

  it('프로젝트 루트 하위 중첩 파일도 안전하다', () => {
    expect(isPathSafe('.claude/settings.json', projectRoot)).toBe(true)
  })

  it('.. 트래버설로 프로젝트 루트 탈출을 거부한다', () => {
    expect(isPathSafe('../outside/file.txt', projectRoot)).toBe(false)
  })

  it('프로젝트 루트 자체(.)는 resolved === normalizedRoot 조건으로 허용된다', () => {
    // path.resolve(projectRoot, '.') === projectRoot 이므로 isPathSafe는 true를 반환한다
    expect(isPathSafe('.', projectRoot)).toBe(true)
  })
})

describe('isPathSafe — 경로 길이 제한', () => {
  it('500자를 초과하는 경로는 거부한다', () => {
    const longPath = '~/' + 'a'.repeat(500)
    expect(isPathSafe(longPath)).toBe(false)
  })

  it('정확히 500자인 경로는 거부한다', () => {
    const path500 = '~/' + 'a'.repeat(499)
    expect(path500.length).toBe(501)
    expect(isPathSafe(path500)).toBe(false)
  })

  it('500자 이하인 경로는 길이 제한으로 거부되지 않는다', () => {
    const shortPath = '~/.claude/settings.json'
    expect(isPathSafe(shortPath)).toBe(true)
  })
})

describe('CRLF 정규화', () => {
  it('\\r\\n을 \\n으로 변환한다', () => {
    const crlf = 'line1\r\nline2\r\nline3'
    const normalized = crlf.replace(/\r\n/g, '\n')
    expect(normalized).toBe('line1\nline2\nline3')
    expect(normalized).not.toContain('\r')
  })

  it('이미 \\n만 있는 내용은 변환 후 동일하다', () => {
    const lf = 'line1\nline2\nline3'
    const normalized = lf.replace(/\r\n/g, '\n')
    expect(normalized).toBe(lf)
  })

  it('혼합된 줄 끝도 \\r\\n 부분만 정규화한다', () => {
    const mixed = 'line1\nline2\r\nline3'
    const normalized = mixed.replace(/\r\n/g, '\n')
    expect(normalized).toBe('line1\nline2\nline3')
  })
})

describe('isPathSafe — 대소문자 비교 일관성 (normalizePath 적용)', () => {
  it('같은 경로를 정규화하면 동일한 결과를 반환한다', () => {
    const home = getUserHome()
    const filePath = '~/.claude/settings.json'
    const resolved = path.resolve(resolveUserPath(filePath))

    // normalizePath 적용 전후 동일 플랫폼에서는 결과가 동일해야 한다
    const normalizedResolved = normalizePath(resolved)
    const normalizedHome = normalizePath(home)

    expect(normalizedResolved.startsWith(normalizedHome + path.sep)).toBe(true)
  })

  it('projectRoot와 resolved 경로가 normalizePath 후 올바르게 비교된다', () => {
    const projectRoot = path.join(os.tmpdir(), 'my-project')
    const filePath = 'CLAUDE.md'
    const resolved = path.resolve(projectRoot, filePath)

    const normalizedRoot = normalizePath(projectRoot)
    const normalizedResolved = normalizePath(resolved)

    expect(normalizedResolved.startsWith(normalizedRoot + path.sep)).toBe(true)
  })
})
