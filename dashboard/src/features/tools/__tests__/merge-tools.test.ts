import { describe, it, expect } from 'vitest'
import type { IndividualToolRow } from '@/shared/lib/queries'
import type { RegisteredTool } from '@/shared/lib/registered-tools'
import { mergeTools, mergeMcpTools } from '../lib/merge-tools'

const mkRegistered = (overrides: Partial<RegisteredTool> = {}): RegisteredTool => ({
  name: 'test-skill',
  type: 'skill',
  scope: 'project',
  agentType: 'claude',
  projectName: 'argus',
  filePath: '/path/to/SKILL.md',
  ...overrides,
})

const mkUsage = (overrides: Partial<IndividualToolRow> = {}): IndividualToolRow => ({
  tool_name: 'test-skill',
  detail_name: 'test-skill',
  detail_type: 'skill',
  agent_type: 'claude',
  invocation_count: 10,
  success_count: 8,
  fail_count: 2,
  avg_duration_ms: 500,
  last_used: '2026-03-24T10:00:00Z',
  ...overrides,
})

describe('mergeTools', () => {
  it('등록 + 사용 이력 있으면 active 상태로 agentType/projectName 전달', () => {
    const registered = [mkRegistered({ name: 'plan', agentType: 'claude', projectName: 'argus' })]
    const usage = [mkUsage({ detail_name: 'plan', detail_type: 'skill' })]

    const result = mergeTools(registered, usage, 'skill')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'plan',
      status: 'active',
      agentType: 'claude',
      projectName: 'argus',
      invocation_count: 10,
    })
  })

  it('등록만 있고 사용 이력 없으면 unused 상태', () => {
    const registered = [mkRegistered({ name: 'unused-skill', agentType: 'codex', projectName: 'other' })]

    const result = mergeTools(registered, [], 'skill')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'unused-skill',
      status: 'unused',
      agentType: 'codex',
      projectName: 'other',
      invocation_count: 0,
    })
  })

  it('사용 이력만 있고 등록 없으면 unregistered 상태 (agentType 없음)', () => {
    const usage = [mkUsage({ detail_name: 'unknown-skill', detail_type: 'skill' })]

    const result = mergeTools([], usage, 'skill')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'unknown-skill',
      status: 'unregistered',
    })
    expect(result[0].agentType).toBeUndefined()
    expect(result[0].projectName).toBeUndefined()
  })

  it('detailType으로 필터링한다', () => {
    const registered = [
      mkRegistered({ name: 'my-skill', type: 'skill' }),
      mkRegistered({ name: 'my-agent', type: 'agent' }),
    ]
    const usage = [
      mkUsage({ detail_name: 'my-skill', detail_type: 'skill' }),
      mkUsage({ detail_name: 'my-agent', detail_type: 'agent' }),
    ]

    const skills = mergeTools(registered, usage, 'skill')
    const agents = mergeTools(registered, usage, 'agent')

    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('my-skill')
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('my-agent')
  })

  it('invocation_count 내림차순 정렬', () => {
    const usage = [
      mkUsage({ detail_name: 'low', detail_type: 'skill', invocation_count: 1 }),
      mkUsage({ detail_name: 'high', detail_type: 'skill', invocation_count: 100 }),
    ]

    const result = mergeTools([], usage, 'skill')

    expect(result[0].name).toBe('high')
    expect(result[1].name).toBe('low')
  })
})

describe('mergeMcpTools', () => {
  it('등록 + 사용 이력 있으면 active 상태로 agentType/projectName/lastUsed 전달', () => {
    const registered = [mkRegistered({ name: 'linear-server', type: 'mcp', agentType: 'claude', projectName: 'argus' })]
    const usage = [mkUsage({ detail_name: 'linear-server', detail_type: 'mcp', last_used: '2026-03-24T12:00:00Z' })]

    const result = mergeMcpTools(registered, usage)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      serverName: 'linear-server',
      status: 'active',
      agentType: 'claude',
      projectName: 'argus',
      totalCalls: 10,
      lastUsed: '2026-03-24T12:00:00Z',
    })
  })

  it('등록만 있고 사용 이력 없으면 unused 상태 (lastUsed 없음)', () => {
    const registered = [mkRegistered({ name: 'unused-mcp', type: 'mcp' })]

    const result = mergeMcpTools(registered, [])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      serverName: 'unused-mcp',
      status: 'unused',
      totalCalls: 0,
    })
    expect(result[0].lastUsed).toBeUndefined()
  })

  it('사용 이력만 있으면 unregistered 상태', () => {
    const usage = [mkUsage({ detail_name: 'unknown-mcp', detail_type: 'mcp' })]

    const result = mergeMcpTools([], usage)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      serverName: 'unknown-mcp',
      status: 'unregistered',
    })
    expect(result[0].agentType).toBeUndefined()
    expect(result[0].projectName).toBeUndefined()
  })
})
