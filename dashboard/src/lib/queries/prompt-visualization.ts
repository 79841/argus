import { getDb } from '../db'
import { generateSessionNarrative, detectRepetitions, trackPromptEvolution, extractCodeAreas } from '../prompt-insights'

type VizFilters = {
  agentType?: string
  from?: string
  to?: string
  limit?: number
}

export type SessionNarrativeRow = {
  sessionId: string
  narrative: string
  promptCount: number
  firstTimestamp: string
  agentType: string
}

export const getSessionNarratives = (filters: VizFilters): SessionNarrativeRow[] => {
  const db = getDb()
  const conditions = ['1=1']
  const params: Array<string | number> = []

  if (filters.agentType && filters.agentType !== 'all') {
    conditions.push('pt.agent_type = ?')
    params.push(filters.agentType)
  }
  if (filters.from) {
    conditions.push("pt.timestamp >= ?")
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push("pt.timestamp <= ?")
    params.push(filters.to)
  }

  const limit = filters.limit ?? 30
  params.push(limit)

  const sessions = db.prepare(`
    SELECT session_id, agent_type, MIN(timestamp) as first_ts, COUNT(*) as cnt
    FROM prompt_texts pt
    WHERE ${conditions.join(' AND ')} AND session_id != ''
    GROUP BY session_id
    ORDER BY first_ts DESC
    LIMIT ?
  `).all(...params) as Array<{ session_id: string; agent_type: string; first_ts: string; cnt: number }>

  return sessions.map(s => {
    const prompts = db.prepare(
      'SELECT prompt_text, timestamp FROM prompt_texts WHERE session_id = ? ORDER BY timestamp ASC'
    ).all(s.session_id) as Array<{ prompt_text: string; timestamp: string }>

    return {
      sessionId: s.session_id,
      narrative: generateSessionNarrative(prompts),
      promptCount: s.cnt,
      firstTimestamp: s.first_ts,
      agentType: s.agent_type,
    }
  })
}

export type RepetitionClusterRow = {
  pattern: string
  count: number
  totalCost: number
  sessionIds: string[]
  recommendation: 'claude_md' | 'skill' | 'none'
}

export const getRepetitionClusters = (filters: VizFilters): RepetitionClusterRow[] => {
  const db = getDb()
  const conditions = ['1=1']
  const params: string[] = []

  if (filters.agentType && filters.agentType !== 'all') {
    conditions.push('pt.agent_type = ?')
    params.push(filters.agentType)
  }
  if (filters.from) {
    conditions.push("pt.timestamp >= ?")
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push("pt.timestamp <= ?")
    params.push(filters.to)
  }

  const rows = db.prepare(`
    SELECT pt.prompt_text, pt.session_id,
           COALESCE(s.session_cost, 0) as cost
    FROM prompt_texts pt
    LEFT JOIN (
      SELECT session_id, SUM(cost_usd) as session_cost
      FROM agent_logs GROUP BY session_id
    ) s ON pt.session_id = s.session_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY pt.timestamp DESC
    LIMIT 1000
  `).all(...params) as Array<{ prompt_text: string; session_id: string; cost: number }>

  return detectRepetitions(rows)
}

export type PromptEvolutionResult = {
  sequence: Array<{
    index: number
    text: string
    timestamp: string
    specificity: number
    costAfter: number
  }>
  refinementScore: number
  costImpact: string
}

export const getSessionEvolution = (sessionId: string): PromptEvolutionResult => {
  const db = getDb()

  const prompts = db.prepare(
    'SELECT prompt_text, timestamp, prompt_id FROM prompt_texts WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(sessionId) as Array<{ prompt_text: string; timestamp: string; prompt_id: string }>

  const costs = db.prepare(
    'SELECT prompt_id, SUM(cost_usd) as cost FROM agent_logs WHERE session_id = ? AND prompt_id != \'\' GROUP BY prompt_id'
  ).all(sessionId) as Array<{ prompt_id: string; cost: number }>

  return trackPromptEvolution(prompts, costs)
}

export type CodeAreaRow = {
  path: string
  promptCount: number
  totalCost: number
  isHotspot: boolean
}

export const getCodeAreaHeatmap = (filters: VizFilters & { project?: string }): CodeAreaRow[] => {
  const db = getDb()
  const conditions = ['1=1']
  const params: string[] = []

  if (filters.project && filters.project !== 'all') {
    conditions.push('pt.project_name = ?')
    params.push(filters.project)
  }
  if (filters.from) {
    conditions.push("pt.timestamp >= ?")
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push("pt.timestamp <= ?")
    params.push(filters.to)
  }

  const rows = db.prepare(`
    SELECT pt.prompt_text,
           COALESCE(s.session_cost, 0) as cost
    FROM prompt_texts pt
    LEFT JOIN (
      SELECT session_id, SUM(cost_usd) as session_cost
      FROM agent_logs GROUP BY session_id
    ) s ON pt.session_id = s.session_id
    WHERE ${conditions.join(' AND ')}
  `).all(...params) as Array<{ prompt_text: string; cost: number }>

  const result = extractCodeAreas(rows)
  return result.areas
}
