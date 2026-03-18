import { getDb } from '../db'

export type PromptSearchResult = {
  id: number
  timestamp: string
  session_id: string
  prompt_id: string
  agent_type: string
  project_name: string
  prompt_text: string
  prompt_length: number
  word_count: number
  has_code: number
  masked_count: number
  highlighted: string
}

export type PromptSearchFilters = {
  sessionId?: string
  agentType?: string
  project?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type SecurityStats = {
  totalPrompts: number
  maskedPrompts: number
  maskedCount: number
}

export type PromptRow = {
  id: number
  timestamp: string
  session_id: string
  prompt_id: string
  agent_type: string
  project_name: string
  prompt_text: string
  prompt_length: number
  word_count: number
  has_code: number
  masked_count: number
}

export const searchPrompts = (query: string, filters: PromptSearchFilters = {}): PromptSearchResult[] => {
  const db = getDb()
  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0

  const conditions: string[] = []
  const params: Array<string | number> = []

  conditions.push('prompt_texts_fts MATCH ?')
  params.push(query)

  if (filters.sessionId) {
    conditions.push('pt.session_id = ?')
    params.push(filters.sessionId)
  }
  if (filters.agentType && filters.agentType !== 'all') {
    conditions.push('pt.agent_type = ?')
    params.push(filters.agentType)
  }
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

  params.push(limit, offset)

  const where = conditions.join(' AND ')
  const sql = `
    SELECT pt.*, highlight(prompt_texts_fts, 0, '<mark>', '</mark>') as highlighted
    FROM prompt_texts_fts
    JOIN prompt_texts pt ON pt.id = prompt_texts_fts.rowid
    WHERE ${where}
    ORDER BY rank
    LIMIT ? OFFSET ?
  `

  return db.prepare(sql).all(...params) as PromptSearchResult[]
}

export const getSecurityStats = (from?: string, to?: string): SecurityStats => {
  const db = getDb()

  const conditions: string[] = ['1=1']
  const params: Array<string> = []

  if (from) {
    conditions.push("timestamp >= ?")
    params.push(from)
  }
  if (to) {
    conditions.push("timestamp <= ?")
    params.push(to)
  }

  const where = conditions.join(' AND ')

  const row = db.prepare(`
    SELECT
      COUNT(*) as totalPrompts,
      SUM(CASE WHEN masked_count > 0 THEN 1 ELSE 0 END) as maskedPrompts,
      SUM(masked_count) as maskedCount
    FROM prompt_texts
    WHERE ${where}
  `).get(...params) as { totalPrompts: number; maskedPrompts: number; maskedCount: number }

  return {
    totalPrompts: row.totalPrompts ?? 0,
    maskedPrompts: row.maskedPrompts ?? 0,
    maskedCount: row.maskedCount ?? 0,
  }
}

export const getPromptsBySession = (sessionId: string): PromptRow[] => {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM prompt_texts
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId) as PromptRow[]
}
