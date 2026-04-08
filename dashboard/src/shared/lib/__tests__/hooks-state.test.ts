import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HooksStateManager } from '../hooks-state'
import type { HookEvent } from '../hooks-state'

let manager: HooksStateManager

beforeEach(() => {
  manager = new HooksStateManager()
})

const makeEvent = (overrides: Partial<HookEvent> & Pick<HookEvent, 'hook_type' | 'session_id'>): HookEvent => ({
  ...overrides,
})

describe('PreToolUse(Agent)', () => {
  it('running 에이전트를 추가한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'code-reviewer' },
    }))

    const projects = manager.getProjects()
    expect(projects).toHaveLength(1)
    const agents = projects[0].sessions[0].agents
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('code-reviewer')
    expect(agents[0].status).toBe('running')
  })

  it('tool_input.name이 없으면 subagent_type을 사용한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { subagent_type: 'my-subagent' },
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].name).toBe('my-subagent')
  })

  it('name, subagent_type 모두 없으면 description을 사용한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { description: 'do something' },
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].name).toBe('do something')
  })

  it('tool_input이 없으면 unknown으로 처리한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].name).toBe('unknown')
  })
})

describe('PostToolUse(Agent)', () => {
  it('가장 최근 running 에이전트를 success로 전환한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'agent-a' },
    }))
    manager.handleHookEvent(makeEvent({
      hook_type: 'PostToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_output: { success: true },
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].status).toBe('success')
  })

  it('tool_output.success가 false이면 failure로 전환한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'agent-a' },
    }))
    manager.handleHookEvent(makeEvent({
      hook_type: 'PostToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_output: { success: false },
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].status).toBe('failure')
  })

  it('duration_ms가 0 이상으로 계산된다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'agent-a' },
    }))
    manager.handleHookEvent(makeEvent({
      hook_type: 'PostToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_output: { success: true },
    }))

    const agents = manager.getProjects()[0].sessions[0].agents
    expect(agents[0].duration_ms).toBeGreaterThanOrEqual(0)
  })
})

describe('Stop', () => {
  it('세션을 stopped로 처리한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'agent-a' },
    }))
    manager.handleHookEvent(makeEvent({
      hook_type: 'Stop',
      session_id: 'sess-1',
    }))

    expect(manager.getProjects()).toHaveLength(0)
    expect(manager.hasActiveSessions()).toBe(false)
  })
})

describe('getProjects()', () => {
  it('올바른 AgentProject[] 형태를 반환한다', () => {
    manager.handleHookEvent(makeEvent({
      hook_type: 'PreToolUse',
      session_id: 'sess-1',
      tool_name: 'Agent',
      tool_input: { name: 'worker' },
    }))

    const projects = manager.getProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0]).toHaveProperty('project_name')
    expect(projects[0]).toHaveProperty('sessions')
    expect(projects[0].sessions[0]).toHaveProperty('session_id', 'sess-1')
    expect(projects[0].sessions[0]).toHaveProperty('agent_type')
    expect(projects[0].sessions[0]).toHaveProperty('first_event')
    expect(projects[0].sessions[0]).toHaveProperty('agents')
  })

  it('stopped 세션은 포함하지 않는다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent', tool_input: { name: 'a' } }))
    manager.handleHookEvent(makeEvent({ hook_type: 'Stop', session_id: 'sess-1' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-2', tool_name: 'Agent', tool_input: { name: 'b' } }))

    const projects = manager.getProjects()
    const sessionIds = projects.flatMap((p) => p.sessions.map((s) => s.session_id))
    expect(sessionIds).not.toContain('sess-1')
    expect(sessionIds).toContain('sess-2')
  })
})

describe('hasActiveSessions()', () => {
  it('활성 세션이 있으면 true를 반환한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent' }))
    expect(manager.hasActiveSessions()).toBe(true)
  })

  it('stopped 세션만 있으면 false를 반환한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'Stop', session_id: 'sess-1' }))
    expect(manager.hasActiveSessions()).toBe(false)
  })

  it('세션이 없으면 false를 반환한다', () => {
    expect(manager.hasActiveSessions()).toBe(false)
  })
})

describe('cleanup()', () => {
  it('10분 이상 된 stopped 세션을 제거한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-old', tool_name: 'Agent' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'Stop', session_id: 'sess-old' }))

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000)
    manager.cleanup()

    expect(manager.hasActiveSessions()).toBe(false)
    expect(manager.getProjects()).toHaveLength(0)

    vi.restoreAllMocks()
  })

  it('10분 미만인 stopped 세션은 유지한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'Stop', session_id: 'sess-1' }))

    manager.cleanup()

    expect(manager.hasActiveSessions()).toBe(false)
  })

  it('15분 이상 된 미완료 세션을 안전장치로 제거한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-stuck', tool_name: 'Agent' }))

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000)
    manager.cleanup()

    expect(manager.getProjects()).toHaveLength(0)

    vi.restoreAllMocks()
  })
})

describe('여러 세션 동시 처리', () => {
  it('세션별로 에이전트를 독립적으로 관리한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-A', tool_name: 'Agent', tool_input: { name: 'agent-a' } }))
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-B', tool_name: 'Agent', tool_input: { name: 'agent-b' } }))
    manager.handleHookEvent(makeEvent({ hook_type: 'Stop', session_id: 'sess-A' }))

    const projects = manager.getProjects()
    const sessionIds = projects.flatMap((p) => p.sessions.map((s) => s.session_id))
    expect(sessionIds).not.toContain('sess-A')
    expect(sessionIds).toContain('sess-B')
  })

  it('같은 프로젝트의 세션들이 동일 project 아래 그룹핑된다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-2', tool_name: 'Agent' }))

    const projects = manager.getProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].sessions).toHaveLength(2)
  })
})

describe('reset()', () => {
  it('전체 세션을 초기화한다', () => {
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-1', tool_name: 'Agent' }))
    manager.handleHookEvent(makeEvent({ hook_type: 'PreToolUse', session_id: 'sess-2', tool_name: 'Agent' }))

    manager.reset()

    expect(manager.getProjects()).toHaveLength(0)
    expect(manager.hasActiveSessions()).toBe(false)
  })
})
