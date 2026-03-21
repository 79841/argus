import { describe, it, expect } from 'vitest'
import {
  parseAgentType,
  parseDays,
  parseLimit,
  VALID_AGENT_TYPES,
} from '@/lib/api-utils'

describe('VALID_AGENT_TYPES', () => {
  it('all, claude, codex, gemini를 포함한다', () => {
    expect(VALID_AGENT_TYPES).toContain('all')
    expect(VALID_AGENT_TYPES).toContain('claude')
    expect(VALID_AGENT_TYPES).toContain('codex')
    expect(VALID_AGENT_TYPES).toContain('gemini')
  })
})

describe('parseAgentType', () => {
  it('유효한 agent type을 반환한다', () => {
    expect(parseAgentType('all')).toBe('all')
    expect(parseAgentType('claude')).toBe('claude')
    expect(parseAgentType('codex')).toBe('codex')
    expect(parseAgentType('gemini')).toBe('gemini')
  })

  it('유효하지 않은 값이면 all을 반환한다', () => {
    expect(parseAgentType('invalid')).toBe('all')
    expect(parseAgentType('unknown')).toBe('all')
    expect(parseAgentType('')).toBe('all')
  })

  it('null이면 all을 반환한다', () => {
    expect(parseAgentType(null)).toBe('all')
  })
})

describe('parseDays', () => {
  it('유효한 숫자 문자열을 파싱한다', () => {
    expect(parseDays('7', 30)).toBe(7)
    expect(parseDays('30', 7)).toBe(30)
    expect(parseDays('365', 30)).toBe(365)
    expect(parseDays('1', 30)).toBe(1)
  })

  it('null이면 defaultValue를 반환한다', () => {
    expect(parseDays(null, 30)).toBe(30)
    expect(parseDays(null, 7)).toBe(7)
  })

  it('숫자가 아닌 문자열이면 defaultValue를 반환한다', () => {
    expect(parseDays('abc', 30)).toBe(30)
    expect(parseDays('', 30)).toBe(30)
  })

  it('범위 초과(365 초과)이면 defaultValue를 반환한다', () => {
    expect(parseDays('366', 30)).toBe(30)
    expect(parseDays('1000', 30)).toBe(30)
  })

  it('1 미만이면 defaultValue를 반환한다', () => {
    expect(parseDays('0', 30)).toBe(30)
    expect(parseDays('-1', 30)).toBe(30)
  })
})

describe('parseLimit', () => {
  it('유효한 숫자 문자열을 파싱한다', () => {
    expect(parseLimit('10', 50)).toBe(10)
    expect(parseLimit('100', 50)).toBe(100)
    expect(parseLimit('10000', 50)).toBe(10000)
    expect(parseLimit('1', 50)).toBe(1)
  })

  it('null이면 defaultValue를 반환한다', () => {
    expect(parseLimit(null, 50)).toBe(50)
    expect(parseLimit(null, 100)).toBe(100)
  })

  it('숫자가 아닌 문자열이면 defaultValue를 반환한다', () => {
    expect(parseLimit('abc', 50)).toBe(50)
    expect(parseLimit('', 50)).toBe(50)
  })

  it('10000 초과이면 defaultValue를 반환한다', () => {
    expect(parseLimit('10001', 50)).toBe(50)
    expect(parseLimit('99999', 50)).toBe(50)
  })

  it('1 미만이면 defaultValue를 반환한다', () => {
    expect(parseLimit('0', 50)).toBe(50)
    expect(parseLimit('-1', 50)).toBe(50)
  })
})
