import { describe, it, expect } from 'vitest'
import os from 'os'
import { toDisplayPath, buildGeminiTelemetry } from '@/shared/lib/setup'

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

  it('홈 디렉토리가 아닌 경로에서도 백슬래시를 슬래시로 변환한다', () => {
    const windowsAbsPath = 'C:\\Users\\foo\\project\\CLAUDE.md'
    const result = toDisplayPath(windowsAbsPath)
    expect(result).not.toContain('\\')
    expect(result).toContain('/')
  })

  it('Windows 홈 경로(백슬래시)를 ~ 로 시작하는 슬래시 경로로 변환한다', () => {
    const windowsHomePath = HOME.replace(/\//g, '\\') + '\\.claude\\settings.json'
    const result = toDisplayPath(windowsHomePath)
    expect(result).toBe('~/.claude/settings.json')
  })
})

describe('buildGeminiTelemetry', () => {
  it('logPrompts: true를 포함한다', () => {
    const result = buildGeminiTelemetry('http://localhost:9845')
    expect(result.logPrompts).toBe(true)
  })

  it('필수 필드를 모두 포함한다', () => {
    const endpoint = 'http://localhost:9845'
    const result = buildGeminiTelemetry(endpoint)
    expect(result).toEqual({
      enabled: true,
      target: 'local',
      otlpEndpoint: endpoint,
      otlpProtocol: 'http',
      logPrompts: true,
    })
  })

  it('전달된 endpoint를 otlpEndpoint에 그대로 설정한다', () => {
    const endpoint = 'http://custom:3000'
    const result = buildGeminiTelemetry(endpoint)
    expect(result.otlpEndpoint).toBe(endpoint)
  })
})
