import { describe, it, expect } from 'vitest'
import os from 'os'
import { toDisplayPath } from '@/shared/lib/setup'

const HOME = os.homedir()

describe('toDisplayPath', () => {
  it('홈 디렉토리 하위 경로를 ~ 로 시작하는 경로로 변환한다', () => {
    const absPath = `${HOME}/.claude/settings.json`
    expect(toDisplayPath(absPath)).toBe('~/.claude/settings.json')
  })

  it('홈 디렉토리가 아닌 경로는 그대로 반환한다', () => {
    const absPath = '/etc/some/config.json'
    expect(toDisplayPath(absPath)).toBe('/etc/some/config.json')
  })

  it('Windows 백슬래시를 슬래시로 변환한다', () => {
    const windowsHomePath = `${HOME}\\.claude\\settings.json`
    const result = toDisplayPath(windowsHomePath)
    expect(result).not.toContain('\\')
    expect(result).toContain('/')
  })

  it('혼합된 경로 구분자를 슬래시로 통일한다', () => {
    const mixedPath = `${HOME}/.claude\\settings.json`
    const result = toDisplayPath(mixedPath)
    expect(result).not.toContain('\\')
  })
})
