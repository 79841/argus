import { getDb } from '../db'
import { API_REQUEST_FILTER } from './helpers'

export type ActiveAgentSession = {
  session_id: string
  agent_type: string
  project_name: string
  first_event: string
  last_event: string
  cost: number
  event_count: number
}

export type SessionAgentBlock = {
  session_id: string
  detail_name: string
  duration_ms: number
  success: number | null
  timestamp: string
}

export const getActiveAgentSessions = (): ActiveAgentSession[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      session_id,
      agent_type,
      COALESCE(project_name, '') as project_name,
      min(timestamp) as first_event,
      max(timestamp) as last_event,
      COALESCE(sum(cost_usd), 0) as cost,
      count(*) as event_count
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND timestamp > datetime('now', '-5 minutes')
      AND session_id != ''
    GROUP BY session_id, agent_type
    ORDER BY last_event DESC
  `).all() as ActiveAgentSession[]
}

export const getSessionAgentBlocks = (sessionIds: string[]): SessionAgentBlock[] => {
  if (sessionIds.length === 0) return []
  const db = getDb()
  const placeholders = sessionIds.map(() => '?').join(',')
  return db.prepare(`
    SELECT
      session_id,
      detail_name,
      COALESCE(duration_ms, 0) as duration_ms,
      success,
      timestamp
    FROM tool_details
    WHERE detail_type = 'agent'
      AND session_id IN (${placeholders})
    ORDER BY timestamp ASC
  `).all(...sessionIds) as SessionAgentBlock[]
}

export type AgentBlock = {
  name: string
  status: 'running' | 'success' | 'failure'
  duration_ms: number
  timestamp: string
}

export type AgentSession = {
  session_id: string
  agent_type: string
  first_event: string
  agents: AgentBlock[]
}

export type AgentProject = {
  project_name: string
  sessions: AgentSession[]
}

export const groupAgentsByProject = (
  sessions: ActiveAgentSession[],
  blocks: SessionAgentBlock[],
): AgentProject[] => {
  const blocksBySession = new Map<string, AgentBlock[]>()
  for (const b of blocks) {
    const status: AgentBlock['status'] =
      b.success === null ? 'running' : b.success === 1 ? 'success' : 'failure'
    const entry: AgentBlock = {
      name: b.detail_name,
      status,
      duration_ms: b.duration_ms,
      timestamp: b.timestamp,
    }
    const arr = blocksBySession.get(b.session_id)
    if (arr) arr.push(entry)
    else blocksBySession.set(b.session_id, [entry])
  }

  const projectMap = new Map<string, AgentSession[]>()
  for (const s of sessions) {
    const key = s.project_name || 'Unknown'
    const session: AgentSession = {
      session_id: s.session_id,
      agent_type: s.agent_type,
      first_event: s.first_event,
      agents: blocksBySession.get(s.session_id) ?? [],
    }
    const arr = projectMap.get(key)
    if (arr) arr.push(session)
    else projectMap.set(key, [session])
  }

  return Array.from(projectMap.entries()).map(
    ([project_name, projectSessions]) => ({ project_name, sessions: projectSessions })
  )
}
