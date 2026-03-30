import { describe, it, expect } from 'vitest'
import {
  parseAgentType,
  parseDays,
  parseLimit,
  parseProject,
  parseDateParam,
  parseSlug,
  VALID_AGENT_TYPES,
} from '@/shared/lib/api-utils'

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

describe('parseProject', () => {
  it('유효한 프로젝트 이름을 반환한다', () => {
    expect(parseProject('argus')).toBe('argus')
    expect(parseProject('my-project')).toBe('my-project')
    expect(parseProject('all')).toBe('all')
  })

  it('null이면 "all"을 반환한다', () => {
    expect(parseProject(null)).toBe('all')
  })

  it('빈 문자열이면 "all"을 반환한다', () => {
    expect(parseProject('')).toBe('all')
  })

  it('maxLength 초과이면 "all"을 반환한다', () => {
    const longName = 'a'.repeat(201)
    expect(parseProject(longName)).toBe('all')
  })

  it('maxLength 이내이면 그대로 반환한다', () => {
    const exactName = 'a'.repeat(200)
    expect(parseProject(exactName)).toBe(exactName)
  })

  it('커스텀 maxLength를 적용한다', () => {
    expect(parseProject('abc', 2)).toBe('all')
    expect(parseProject('ab', 2)).toBe('ab')
  })
})

describe('parseDateParam', () => {
  it('유효한 ISO 날짜 문자열을 반환한다', () => {
    expect(parseDateParam('2024-01-15')).toBe('2024-01-15')
    expect(parseDateParam('2026-03-29')).toBe('2026-03-29')
    expect(parseDateParam('1999-12-31')).toBe('1999-12-31')
  })

  it('null이면 undefined를 반환한다', () => {
    expect(parseDateParam(null)).toBeUndefined()
  })

  it('빈 문자열이면 undefined를 반환한다', () => {
    expect(parseDateParam('')).toBeUndefined()
  })

  it('잘못된 날짜 형식이면 undefined를 반환한다', () => {
    expect(parseDateParam('2024/01/15')).toBeUndefined()
    expect(parseDateParam('01-15-2024')).toBeUndefined()
    expect(parseDateParam('not-a-date')).toBeUndefined()
    expect(parseDateParam('2024-1-1')).toBeUndefined()
    expect(parseDateParam('2024-01-1')).toBeUndefined()
    expect(parseDateParam('2024-01')).toBeUndefined()
    expect(parseDateParam('2024-01-15T10:00:00')).toBeUndefined()
  })
})

describe('parseSlug', () => {
  it('유효한 슬러그 문자열을 반환한다', () => {
    expect(parseSlug('session-abc-123')).toBe('session-abc-123')
    expect(parseSlug('my-tool')).toBe('my-tool')
    expect(parseSlug('project')).toBe('project')
  })

  it('빈 문자열이면 null을 반환한다', () => {
    expect(parseSlug('')).toBeNull()
  })

  it('maxLength 초과이면 null을 반환한다', () => {
    const longSlug = 'a'.repeat(301)
    expect(parseSlug(longSlug)).toBeNull()
  })

  it('maxLength 이내이면 그대로 반환한다', () => {
    const exactSlug = 'a'.repeat(300)
    expect(parseSlug(exactSlug)).toBe(exactSlug)
  })

  it('커스텀 maxLength를 적용한다', () => {
    expect(parseSlug('abc', 2)).toBeNull()
    expect(parseSlug('ab', 2)).toBe('ab')
  })
})
