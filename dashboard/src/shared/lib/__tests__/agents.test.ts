import { describe, it, expect } from 'vitest'
import { AGENTS, AGENT_LIST, getAgentColor, AGENT_TOOL_CATEGORIES } from '@/shared/lib/agents'
import type { AgentType, AgentConfig } from '@/shared/lib/agents'

describe('AGENTS', () => {
  it('all, codex, claude, gemini 설정을 포함한다', () => {
    expect(AGENTS.all).toBeDefined()
    expect(AGENTS.codex).toBeDefined()
    expect(AGENTS.claude).toBeDefined()
    expect(AGENTS.gemini).toBeDefined()
  })

  it('각 에이전트 설정이 올바른 필드를 갖는다', () => {
    const requiredFields: (keyof AgentConfig)[] = [
      'id', 'name', 'color', 'hex', 'cssVar', 'cssVarMuted', 'cssVarSubtle'
    ]
    for (const agentType of ['all', 'codex', 'claude', 'gemini'] as AgentType[]) {
      const config = AGENTS[agentType]
      for (const field of requiredFields) {
        expect(config[field], `${agentType}.${field}이 정의되어야 한다`).toBeDefined()
      }
    }
  })

  it('all 에이전트의 색상은 violet이다', () => {
    expect(AGENTS.all.color).toBe('violet')
    expect(AGENTS.all.hex).toBe('#8b5cf6')
  })

  it('codex 에이전트의 색상은 emerald이다', () => {
    expect(AGENTS.codex.color).toBe('emerald')
    expect(AGENTS.codex.hex).toBe('#10b981')
  })

  it('claude 에이전트의 색상은 orange이다', () => {
    expect(AGENTS.claude.color).toBe('orange')
    expect(AGENTS.claude.hex).toBe('#f97316')
  })

  it('gemini 에이전트의 색상은 blue이다', () => {
    expect(AGENTS.gemini.color).toBe('blue')
    expect(AGENTS.gemini.hex).toBe('#3b82f6')
  })

  it('각 에이전트의 id가 키와 일치한다', () => {
    expect(AGENTS.all.id).toBe('all')
    expect(AGENTS.codex.id).toBe('codex')
    expect(AGENTS.claude.id).toBe('claude')
    expect(AGENTS.gemini.id).toBe('gemini')
  })

  it('에이전트 이름이 올바르다', () => {
    expect(AGENTS.all.name).toBe('All Agents')
    expect(AGENTS.codex.name).toBe('Codex')
    expect(AGENTS.claude.name).toBe('Claude Code')
    expect(AGENTS.gemini.name).toBe('Gemini CLI')
  })
})

describe('AGENT_LIST', () => {
  it('4개의 에이전트를 포함한다', () => {
    expect(AGENT_LIST).toHaveLength(4)
  })

  it('all, codex, claude, gemini 순서로 포함한다', () => {
    expect(AGENT_LIST[0].id).toBe('all')
    expect(AGENT_LIST[1].id).toBe('codex')
    expect(AGENT_LIST[2].id).toBe('claude')
    expect(AGENT_LIST[3].id).toBe('gemini')
  })

  it('AGENTS 객체의 값과 동일한 참조를 가진다', () => {
    expect(AGENT_LIST[0]).toBe(AGENTS.all)
    expect(AGENT_LIST[1]).toBe(AGENTS.codex)
    expect(AGENT_LIST[2]).toBe(AGENTS.claude)
    expect(AGENT_LIST[3]).toBe(AGENTS.gemini)
  })
})

describe('getAgentColor', () => {
  it('유효한 에이전트 타입의 hex 색상을 반환한다', () => {
    expect(getAgentColor('all')).toBe('#8b5cf6')
    expect(getAgentColor('codex')).toBe('#10b981')
    expect(getAgentColor('claude')).toBe('#f97316')
    expect(getAgentColor('gemini')).toBe('#3b82f6')
  })

  it('유효하지 않은 에이전트 타입이면 기본 violet 색상을 반환한다', () => {
    expect(getAgentColor('unknown')).toBe('#8b5cf6')
    expect(getAgentColor('')).toBe('#8b5cf6')
    expect(getAgentColor('invalid')).toBe('#8b5cf6')
  })
})

describe('AGENT_TOOL_CATEGORIES', () => {
  it('File Read 카테고리에 Gemini read_many_files가 포함된다', () => {
    expect(AGENT_TOOL_CATEGORIES['File Read']).toContain('read_many_files')
  })

  it('File Edit 카테고리에 Gemini replace가 포함된다', () => {
    expect(AGENT_TOOL_CATEGORIES['File Edit']).toContain('replace')
  })

  it('Search 카테고리에 Gemini glob, grep_search, google_web_search가 포함된다', () => {
    const search = AGENT_TOOL_CATEGORIES['Search']
    expect(search).toContain('glob')
    expect(search).toContain('grep_search')
    expect(search).toContain('google_web_search')
  })

  it('Web 카테고리가 존재하고 web_fetch를 포함한다', () => {
    expect(AGENT_TOOL_CATEGORIES['Web']).toBeDefined()
    expect(AGENT_TOOL_CATEGORIES['Web']).toContain('web_fetch')
  })

  it('Memory 카테고리가 존재하고 save_memory를 포함한다', () => {
    expect(AGENT_TOOL_CATEGORIES['Memory']).toBeDefined()
    expect(AGENT_TOOL_CATEGORIES['Memory']).toContain('save_memory')
  })

  it('기존 카테고리(File Read, File Write, File Edit, Shell, Search, Orchestration)가 유지된다', () => {
    const expectedCategories = ['File Read', 'File Write', 'File Edit', 'Shell', 'Search', 'Orchestration']
    for (const category of expectedCategories) {
      expect(AGENT_TOOL_CATEGORIES[category], `${category} 카테고리가 존재해야 한다`).toBeDefined()
    }
  })

  it('기존 도구들이 그대로 유지된다', () => {
    expect(AGENT_TOOL_CATEGORIES['File Read']).toContain('Read')
    expect(AGENT_TOOL_CATEGORIES['File Edit']).toContain('Edit')
    expect(AGENT_TOOL_CATEGORIES['Shell']).toContain('Bash')
    expect(AGENT_TOOL_CATEGORIES['Search']).toContain('Glob')
    expect(AGENT_TOOL_CATEGORIES['Orchestration']).toContain('Agent')
  })
})
