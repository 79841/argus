import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'

// isPathSafe 로직을 직접 검증하기 위해 동일한 구현을 테스트용으로 재현
// route.ts의 private 함수이므로 로직을 추출하여 단위 테스트

const normalizePath = (p: string): string =>
  process.platform === 'win32' ? p.toLowerCase() : p

const getUserHome = () => os.homedir()

const resolveUserPath = (filePath: string): string =>
  path.join(getUserHome(), filePath.slice(2))

const isPathSafe = (filePath: string, projectRoot?: string): boolean => {
  if (filePath.startsWith('~/')) {
    const resolved = normalizePath(path.resolve(resolveUserPath(filePath)))
    const home = normalizePath(getUserHome())
    return resolved.startsWith(home + path.sep) || resolved === home
  }
  if (!projectRoot) return false
  const normalizedRoot = normalizePath(projectRoot)
  const resolved = normalizePath(path.resolve(projectRoot, filePath))
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
