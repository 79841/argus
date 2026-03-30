import { describe, it, expect } from 'vitest'
import {
  API_REQUEST_FILTER,
  sanitizeAgentType,
  agentFilter,
  agentParams,
  projectFilter,
  projectParams,
  dateRangeFilter,
} from '../queries/helpers'

describe('API_REQUEST_FILTER', () => {
  it('api_request 이벤트 필터 SQL을 포함한다', () => {
    expect(API_REQUEST_FILTER).toBe("event_name = 'api_request'")
  })
})

describe('sanitizeAgentType', () => {
  it.each(['all', 'claude', 'codex', 'gemini'])('유효한 타입 "%s"을 그대로 반환한다', (type) => {
    expect(sanitizeAgentType(type)).toBe(type)
  })

  it.each(['invalid', '', 'CLAUDE', 'openai', 'gpt'])('유효하지 않은 타입 "%s"에 대해 "all"을 반환한다', (type) => {
    expect(sanitizeAgentType(type)).toBe('all')
  })
})

describe('agentFilter', () => {
  it('"all"이면 빈 문자열을 반환한다', () => {
    expect(agentFilter('all')).toBe('')
  })

  it('특정 에이전트면 AND 절을 반환한다', () => {
    expect(agentFilter('claude')).toBe('AND agent_type = ?')
  })
})

describe('agentParams', () => {
  it('"all"이면 빈 배열을 반환한다', () => {
    expect(agentParams('all')).toEqual([])
  })

  it('특정 에이전트면 해당 값을 배열로 반환한다', () => {
    expect(agentParams('claude')).toEqual(['claude'])
    expect(agentParams('codex')).toEqual(['codex'])
  })
})

describe('projectFilter', () => {
  it('"all"이면 빈 문자열을 반환한다', () => {
    expect(projectFilter('all')).toBe('')
  })

  it('특정 프로젝트면 AND 절을 반환한다', () => {
    expect(projectFilter('my-project')).toBe('AND project_name = ?')
  })
})

describe('projectParams', () => {
  it('"all"이면 빈 배열을 반환한다', () => {
    expect(projectParams('all')).toEqual([])
  })

  it('특정 프로젝트면 해당 값을 배열로 반환한다', () => {
    expect(projectParams('my-project')).toEqual(['my-project'])
  })
})

describe('dateRangeFilter', () => {
  it('날짜 범위 AND 절을 반환한다', () => {
    const result = dateRangeFilter()
    expect(result).toContain('date(timestamp) >= date(?)')
    expect(result).toContain('date(timestamp) <= date(?)')
    expect(result).toMatch(/^AND /)
  })
})
