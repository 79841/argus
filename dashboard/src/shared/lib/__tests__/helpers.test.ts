import { describe, it, expect } from 'vitest'
import {
  API_REQUEST_FILTER,
  sanitizeAgentType,
  agentFilter,
  agentParams,
  projectFilter,
  projectParams,
  dateRangeFilter,
} from '@/shared/lib/queries/helpers'

describe('API_REQUEST_FILTER', () => {
  it('올바른 필터 문자열이다', () => {
    expect(API_REQUEST_FILTER).toBe("event_name = 'api_request'")
  })
})

describe('sanitizeAgentType', () => {
  it('유효한 agent type을 그대로 반환한다', () => {
    expect(sanitizeAgentType('all')).toBe('all')
    expect(sanitizeAgentType('claude')).toBe('claude')
    expect(sanitizeAgentType('codex')).toBe('codex')
    expect(sanitizeAgentType('gemini')).toBe('gemini')
  })

  it('유효하지 않은 값이면 all을 반환한다', () => {
    expect(sanitizeAgentType('invalid')).toBe('all')
    expect(sanitizeAgentType('')).toBe('all')
    expect(sanitizeAgentType('unknown')).toBe('all')
  })
})

describe('agentFilter', () => {
  it('all이면 빈 문자열을 반환한다', () => {
    expect(agentFilter('all')).toBe('')
  })

  it('특정 에이전트 타입이면 AND 조건을 반환한다', () => {
    expect(agentFilter('claude')).toBe('AND agent_type = ?')
    expect(agentFilter('codex')).toBe('AND agent_type = ?')
    expect(agentFilter('gemini')).toBe('AND agent_type = ?')
  })
})

describe('agentParams', () => {
  it('all이면 빈 배열을 반환한다', () => {
    expect(agentParams('all')).toEqual([])
  })

  it('특정 에이전트 타입이면 해당 값을 배열로 반환한다', () => {
    expect(agentParams('claude')).toEqual(['claude'])
    expect(agentParams('codex')).toEqual(['codex'])
    expect(agentParams('gemini')).toEqual(['gemini'])
  })
})

describe('projectFilter', () => {
  it('all이면 빈 문자열을 반환한다', () => {
    expect(projectFilter('all')).toBe('')
  })

  it('특정 프로젝트이면 AND 조건을 반환한다', () => {
    expect(projectFilter('my-project')).toBe('AND project_name = ?')
    expect(projectFilter('argus')).toBe('AND project_name = ?')
  })
})

describe('projectParams', () => {
  it('all이면 빈 배열을 반환한다', () => {
    expect(projectParams('all')).toEqual([])
  })

  it('특정 프로젝트이면 해당 값을 배열로 반환한다', () => {
    expect(projectParams('my-project')).toEqual(['my-project'])
    expect(projectParams('argus')).toEqual(['argus'])
  })
})

describe('dateRangeFilter', () => {
  it('날짜 범위 필터 SQL 문자열을 반환한다', () => {
    const filter = dateRangeFilter()
    expect(filter).toBe('AND date(timestamp) >= date(?) AND date(timestamp) <= date(?)')
  })

  it('AND로 시작한다', () => {
    expect(dateRangeFilter()).toMatch(/^AND /)
  })
})
