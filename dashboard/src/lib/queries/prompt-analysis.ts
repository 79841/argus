import { getDb } from '../db'
import { classifyPrompt, calculateComplexity, calculateEffectiveness, analyzeSessionFailure, PROMPT_CATEGORIES } from '../prompt-analysis'
import type { PromptCategory } from '../prompt-analysis'

type AnalysisFilters = {
  agentType?: string
  from?: string
  to?: string
}

type PromptWithSession = {
  prompt_text: string
  prompt_length: number
  word_count: number
  has_code: number
  session_id: string
  agent_type: string
  timestamp: string
}

export type ComplexityCostRow = {
  promptLength: number
  wordCount: number
  hasCode: number
  sessionCost: number
  sessionTurns: number
  agentType: string
  category: string
  complexityScore: number
}

export const getComplexityCostCorrelation = (filters: AnalysisFilters): ComplexityCostRow[] => {
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
    SELECT pt.prompt_text, pt.prompt_length, pt.word_count, pt.has_code,
           pt.session_id, pt.agent_type,
           COALESCE(s.session_cost, 0) as session_cost,
           COALESCE(s.session_turns, 0) as session_turns
    FROM prompt_texts pt
    LEFT JOIN (
      SELECT session_id,
             SUM(cost_usd) as session_cost,
             COUNT(CASE WHEN event_name = 'api_request' THEN 1 END) as session_turns
      FROM agent_logs
      GROUP BY session_id
    ) s ON pt.session_id = s.session_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY pt.timestamp DESC
    LIMIT 500
  `).all(...params) as Array<PromptWithSession & { session_cost: number; session_turns: number }>

  return rows.map(r => ({
    promptLength: r.prompt_length,
    wordCount: r.word_count,
    hasCode: r.has_code,
    sessionCost: r.session_cost,
    sessionTurns: r.session_turns,
    agentType: r.agent_type,
    category: classifyPrompt(r.prompt_text),
    complexityScore: calculateComplexity(r.prompt_text).score,
  }))
}

export type CategoryDistRow = {
  category: PromptCategory
  label: string
  count: number
  totalCost: number
  avgCost: number
  avgTurns: number
}

export const getCategoryDistribution = (filters: AnalysisFilters): CategoryDistRow[] => {
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
           COALESCE(s.session_cost, 0) as session_cost,
           COALESCE(s.session_turns, 0) as session_turns
    FROM prompt_texts pt
    LEFT JOIN (
      SELECT session_id,
             SUM(cost_usd) as session_cost,
             COUNT(CASE WHEN event_name = 'api_request' THEN 1 END) as session_turns
      FROM agent_logs
      GROUP BY session_id
    ) s ON pt.session_id = s.session_id
    WHERE ${conditions.join(' AND ')}
  `).all(...params) as Array<{ prompt_text: string; session_id: string; session_cost: number; session_turns: number }>

  const categoryMap = new Map<PromptCategory, { count: number; totalCost: number; totalTurns: number }>()

  for (const r of rows) {
    const cat = classifyPrompt(r.prompt_text)
    const existing = categoryMap.get(cat) ?? { count: 0, totalCost: 0, totalTurns: 0 }
    existing.count++
    existing.totalCost += r.session_cost
    existing.totalTurns += r.session_turns
    categoryMap.set(cat, existing)
  }

  return Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    label: (PROMPT_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat,
    count: data.count,
    totalCost: Math.round(data.totalCost * 100) / 100,
    avgCost: data.count > 0 ? Math.round((data.totalCost / data.count) * 100) / 100 : 0,
    avgTurns: data.count > 0 ? Math.round(data.totalTurns / data.count) : 0,
  })).sort((a, b) => b.count - a.count)
}

export type FailedSessionRow = {
  sessionId: string
  agentType: string
  totalCost: number
  turnCount: number
  toolSuccessRate: number
  errorRate: number
  reason: string | null
  recommendation: string
  suggestedAgent: string | null
  confidence: number
}

export const getFailedSessions = (filters: AnalysisFilters): FailedSessionRow[] => {
  const db = getDb()
  const conditions = ['1=1']
  const params: string[] = []

  if (filters.agentType && filters.agentType !== 'all') {
    conditions.push('al.agent_type = ?')
    params.push(filters.agentType)
  }
  if (filters.from) {
    conditions.push("al.timestamp >= ?")
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push("al.timestamp <= ?")
    params.push(filters.to)
  }

  const sessions = db.prepare(`
    SELECT
      al.session_id,
      al.agent_type,
      SUM(al.cost_usd) as total_cost,
      COUNT(CASE WHEN al.event_name = 'api_request' THEN 1 END) as turn_count,
      COUNT(CASE WHEN al.event_name = 'tool_result' AND al.tool_success = 1 THEN 1 END) as tool_success,
      COUNT(CASE WHEN al.event_name = 'tool_result' THEN 1 END) as tool_total,
      COUNT(CASE WHEN al.event_name = 'api_error' THEN 1 END) as error_count,
      COUNT(*) as total_events
    FROM agent_logs al
    WHERE ${conditions.join(' AND ')} AND al.session_id != ''
    GROUP BY al.session_id
    HAVING total_cost > 0.5 OR turn_count > 10
    ORDER BY total_cost DESC
    LIMIT 50
  `).all(...params) as Array<{
    session_id: string; agent_type: string; total_cost: number; turn_count: number;
    tool_success: number; tool_total: number; error_count: number; total_events: number
  }>

  const results: FailedSessionRow[] = []

  for (const s of sessions) {
    const toolSuccessRate = s.tool_total > 0 ? s.tool_success / s.tool_total : 1
    const errorRate = s.total_events > 0 ? s.error_count / s.total_events : 0

    const promptRows = db.prepare(
      'SELECT prompt_text FROM prompt_texts WHERE session_id = ?'
    ).all(s.session_id) as Array<{ prompt_text: string }>

    const promptCategories = promptRows.map(p => classifyPrompt(p.prompt_text))
    const avgComplexity = promptRows.length > 0
      ? promptRows.reduce((sum, p) => sum + calculateComplexity(p.prompt_text).score, 0) / promptRows.length
      : 50

    const analysis = analyzeSessionFailure({
      totalCost: s.total_cost,
      turnCount: s.turn_count,
      toolSuccessRate,
      errorRate,
      promptCategories,
      avgComplexity,
    })

    if (analysis.isFailure) {
      results.push({
        sessionId: s.session_id,
        agentType: s.agent_type,
        totalCost: s.total_cost,
        turnCount: s.turn_count,
        toolSuccessRate,
        errorRate,
        reason: analysis.reason,
        recommendation: analysis.recommendation,
        suggestedAgent: analysis.suggestedAgent,
        confidence: analysis.confidence,
      })
    }
  }

  return results
}

export type EffectivenessPatternRow = {
  category: string
  avgScore: number
  avgCost: number
  avgTurns: number
  bestPractice: string
}

export const getEffectivenessPatterns = (filters: AnalysisFilters): EffectivenessPatternRow[] => {
  const data = getComplexityCostCorrelation(filters)
  const db = getDb()

  const categoryGroups = new Map<string, Array<{ score: number; cost: number; turns: number }>>()

  for (const row of data) {
    const successRow = db.prepare(`
      SELECT
        COUNT(CASE WHEN event_name = 'tool_result' AND tool_success = 1 THEN 1 END) as success,
        COUNT(CASE WHEN event_name = 'tool_result' THEN 1 END) as total
      FROM agent_logs WHERE session_id = ?
    `).get(row.agentType) as { success: number; total: number } | undefined

    const toolSuccessRate = (successRow && successRow.total > 0) ? successRow.success / successRow.total : 0.7

    const complexity = { score: row.complexityScore, level: 'moderate' as const, factors: { length: 0, codeRatio: 0, specificity: 0, multiStep: 0 } }
    const eff = calculateEffectiveness({
      text: '',
      complexity,
      sessionCost: row.sessionCost,
      sessionTurns: row.sessionTurns,
      toolSuccessRate,
    })

    const group = categoryGroups.get(row.category) ?? []
    group.push({ score: eff.score, cost: row.sessionCost, turns: row.sessionTurns })
    categoryGroups.set(row.category, group)
  }

  return Array.from(categoryGroups.entries()).map(([cat, items]) => {
    const avgScore = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length)
    const avgCost = Math.round(items.reduce((s, i) => s + i.cost, 0) / items.length * 100) / 100
    const avgTurns = Math.round(items.reduce((s, i) => s + i.turns, 0) / items.length)

    const label = (PROMPT_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat
    const bestPractice = avgScore >= 70
      ? `${label} 작업의 효과성이 높습니다`
      : `${label} 작업 시 파일 경로와 구체적 요구사항을 포함하세요`

    return { category: cat, avgScore, avgCost, avgTurns, bestPractice }
  }).sort((a, b) => b.avgScore - a.avgScore)
}
