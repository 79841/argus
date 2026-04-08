import type { AgentBlock, AgentProject, AgentSession } from '@/shared/lib/queries/agents'

export type HookEventType = 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop'

export type HookEvent = {
  hook_type: HookEventType
  session_id: string
  tool_name?: string
  tool_input?: {
    prompt?: string
    description?: string
    subagent_type?: string
    name?: string
  }
  tool_output?: {
    success?: boolean
  }
  stop_reason?: string
  subagent_name?: string
}

type HookAgent = {
  name: string
  status: 'running' | 'success' | 'failure'
  started_at: string
  duration_ms: number
}

type HookSession = {
  session_id: string
  project_name: string
  agent_type: string
  first_event: string
  agents: Map<string, HookAgent>
  stopped: boolean
  last_event: string
}

const resolveAgentName = (event: HookEvent): string =>
  event.tool_input?.name ??
  event.tool_input?.subagent_type ??
  event.tool_input?.description ??
  'unknown'

const findLastRunningKey = (agents: Map<string, HookAgent>): string | undefined => {
  let found: string | undefined
  for (const [key, agent] of agents) {
    if (agent.status === 'running') found = key
  }
  return found
}

export class HooksStateManager {
  private sessions = new Map<string, HookSession>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000)
  }

  private getOrCreateSession(event: HookEvent): HookSession {
    const existing = this.sessions.get(event.session_id)
    if (existing) return existing

    const now = new Date().toISOString()
    const session: HookSession = {
      session_id: event.session_id,
      project_name: 'Unknown',
      agent_type: 'claude',
      first_event: now,
      agents: new Map(),
      stopped: false,
      last_event: now,
    }
    this.sessions.set(event.session_id, session)
    return session
  }

  handleHookEvent(event: HookEvent): void {
    const session = this.getOrCreateSession(event)
    const now = new Date().toISOString()
    session.last_event = now

    if (event.hook_type === 'PreToolUse' && event.tool_name === 'Agent') {
      const name = resolveAgentName(event)
      const key = `${name}-${Date.now()}`
      session.agents.set(key, {
        name,
        status: 'running',
        started_at: now,
        duration_ms: 0,
      })
      return
    }

    if (event.hook_type === 'PostToolUse' && event.tool_name === 'Agent') {
      const key = findLastRunningKey(session.agents)
      if (key) {
        const agent = session.agents.get(key)!
        const duration = Date.now() - new Date(agent.started_at).getTime()
        agent.status = event.tool_output?.success !== false ? 'success' : 'failure'
        agent.duration_ms = duration
      }
      return
    }

    if (event.hook_type === 'Stop') {
      session.stopped = true
      return
    }

    if (event.hook_type === 'SubagentStop') {
      const targetName = event.subagent_name
      if (!targetName) return
      const key = findLastRunningKey(session.agents)
      if (key) {
        const agent = session.agents.get(key)!
        if (agent.name === targetName) {
          const duration = Date.now() - new Date(agent.started_at).getTime()
          agent.status = 'success'
          agent.duration_ms = duration
        }
      }
    }
  }

  getProjects(): AgentProject[] {
    const projectMap = new Map<string, AgentSession[]>()

    for (const session of this.sessions.values()) {
      if (session.stopped) continue

      const agents: AgentBlock[] = Array.from(session.agents.values()).map((a) => ({
        name: a.name,
        status: a.status,
        duration_ms: a.duration_ms,
        timestamp: a.started_at,
      }))

      const agentSession: AgentSession = {
        session_id: session.session_id,
        agent_type: session.agent_type,
        first_event: session.first_event,
        agents,
      }

      const key = session.project_name || 'Unknown'
      const arr = projectMap.get(key)
      if (arr) arr.push(agentSession)
      else projectMap.set(key, [agentSession])
    }

    return Array.from(projectMap.entries()).map(([project_name, sessions]) => ({
      project_name,
      sessions,
    }))
  }

  hasActiveSessions(): boolean {
    return Array.from(this.sessions.values()).some((s) => !s.stopped)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      const lastTime = new Date(session.last_event).getTime()
      if (session.stopped && now - lastTime > 10 * 60 * 1000) {
        this.sessions.delete(id)
      } else if (!session.stopped && now - lastTime > 15 * 60 * 1000) {
        this.sessions.delete(id)
      }
    }
  }

  reset(): void {
    this.sessions.clear()
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

export const hooksState = new HooksStateManager()

export const mergeHookAndOtelProjects = (
  hookProjects: AgentProject[],
  otelProjects: AgentProject[],
): AgentProject[] => {
  const hookSessionIds = new Set<string>()
  for (const p of hookProjects) {
    for (const s of p.sessions) hookSessionIds.add(s.session_id)
  }

  const projectMap = new Map<string, AgentProject>()
  for (const p of hookProjects) {
    projectMap.set(p.project_name, { ...p, sessions: [...p.sessions] })
  }

  for (const p of otelProjects) {
    const otelOnly = p.sessions.filter((s) => !hookSessionIds.has(s.session_id))
    if (otelOnly.length === 0) continue
    const existing = projectMap.get(p.project_name)
    if (existing) existing.sessions.push(...otelOnly)
    else projectMap.set(p.project_name, { project_name: p.project_name, sessions: otelOnly })
  }

  return Array.from(projectMap.values())
}
