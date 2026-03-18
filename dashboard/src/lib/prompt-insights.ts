export const generateSessionNarrative = (prompts: Array<{
  prompt_text: string
  timestamp: string
}>): string => {
  if (prompts.length === 0) return ''

  const summaries = prompts.map(p => extractKeyPhrase(p.prompt_text))

  if (summaries.length === 1) return summaries[0]
  if (summaries.length <= 5) return summaries.join(' → ')
  return [...summaries.slice(0, 3), '...', ...summaries.slice(-2)].join(' → ')
}

const extractKeyPhrase = (text: string): string => {
  const firstLine = text.split('\n')[0].trim()
  if (firstLine.length <= 40) return firstLine
  const words = firstLine.split(/\s+/).slice(0, 6)
  return words.join(' ') + (firstLine.split(/\s+/).length > 6 ? '...' : '')
}

export type RepetitionCluster = {
  pattern: string
  count: number
  totalCost: number
  sessionIds: string[]
  recommendation: 'claude_md' | 'skill' | 'none'
}

export const detectRepetitions = (prompts: Array<{
  prompt_text: string
  session_id: string
  cost: number
}>): RepetitionCluster[] => {
  const normalized = prompts.map(p => ({
    ...p,
    normalized: normalizePrompt(p.prompt_text),
  }))

  const clusters = new Map<string, { texts: string[]; cost: number; sessions: Set<string> }>()

  for (let i = 0; i < normalized.length; i++) {
    let foundCluster = false
    for (const [key, cluster] of clusters) {
      if (similarity(normalized[i].normalized, key) >= 0.6) {
        cluster.texts.push(normalized[i].prompt_text)
        cluster.cost += normalized[i].cost
        cluster.sessions.add(normalized[i].session_id)
        foundCluster = true
        break
      }
    }
    if (!foundCluster) {
      clusters.set(normalized[i].normalized, {
        texts: [normalized[i].prompt_text],
        cost: normalized[i].cost,
        sessions: new Set([normalized[i].session_id]),
      })
    }
  }

  return Array.from(clusters.entries())
    .filter(([, v]) => v.texts.length >= 3)
    .map(([, v]) => ({
      pattern: v.texts[0],
      count: v.texts.length,
      totalCost: v.cost,
      sessionIds: Array.from(v.sessions),
      recommendation: (v.texts.length >= 5 ? 'skill' : 'claude_md') as RepetitionCluster['recommendation'],
    }))
    .sort((a, b) => b.count - a.count)
}

const normalizePrompt = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[\w.-]+\/[\w.-]+(?:\.\w+)?/g, '<PATH>')
    .replace(/`[^`]+`/g, '<CODE>')
    .replace(/\s+/g, ' ')
    .trim()
}

export const similarity = (a: string, b: string): number => {
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

export type PromptEvolution = {
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

export const trackPromptEvolution = (
  sessionPrompts: Array<{ prompt_text: string; timestamp: string; prompt_id: string }>,
  sessionCosts: Array<{ prompt_id: string; cost: number }>
): PromptEvolution => {
  const costMap = new Map<string, number>()
  for (const c of sessionCosts) {
    costMap.set(c.prompt_id, (costMap.get(c.prompt_id) ?? 0) + c.cost)
  }

  const sequence = sessionPrompts.map((p, i) => ({
    index: i,
    text: p.prompt_text,
    timestamp: p.timestamp,
    specificity: calculateSpecificity(p.prompt_text),
    costAfter: costMap.get(p.prompt_id) ?? 0,
  }))

  const firstSpec = sequence[0]?.specificity ?? 0
  const avgSpec = sequence.reduce((sum, s) => sum + s.specificity, 0) / (sequence.length || 1)
  const refinementScore = Math.min(100, Math.round(avgSpec))

  const totalCost = sequence.reduce((sum, s) => sum + s.costAfter, 0)
  const costImpact = firstSpec < 30
    ? `초기 프롬프트가 모호합니다. 구체화하면 비용을 줄일 수 있습니다. (현재 세션 비용: $${totalCost.toFixed(2)})`
    : `초기 프롬프트가 구체적입니다. (세션 비용: $${totalCost.toFixed(2)})`

  return { sequence, refinementScore, costImpact }
}

const calculateSpecificity = (text: string): number => {
  let score = 0
  const filePaths = (text.match(/[\w.-]+\/[\w.-]+(?:\.\w+)?/g) || []).length
  score += Math.min(30, filePaths * 10)
  const funcNames = (text.match(/(?:function|class|const|def|export)\s+\w+/g) || []).length
  score += Math.min(20, funcNames * 7)
  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length
  score += Math.min(20, codeBlocks * 10)
  if (text.length > 100) score += 10
  if (text.length > 300) score += 10
  const actionVerbs = ['구현', '수정', '추가', '삭제', 'implement', 'fix', 'add', 'remove', 'create', 'update']
  score += Math.min(10, actionVerbs.filter(v => text.toLowerCase().includes(v)).length * 5)
  return Math.min(100, score)
}

export type CodeAreaHeatmap = {
  areas: Array<{
    path: string
    promptCount: number
    totalCost: number
    isHotspot: boolean
  }>
}

export const extractCodeAreas = (prompts: Array<{
  prompt_text: string
  cost: number
}>): CodeAreaHeatmap => {
  const areaMap = new Map<string, { count: number; cost: number }>()

  for (const p of prompts) {
    const paths = p.prompt_text.match(/[\w.-]+\/[\w.-]+(?:\.\w+)?/g) || []
    const dirs = new Set<string>()
    for (const path of paths) {
      const parts = path.split('/')
      if (parts.length >= 2) {
        dirs.add(parts.slice(0, 2).join('/'))
      }
      dirs.add(path)
    }
    for (const dir of dirs) {
      const existing = areaMap.get(dir) ?? { count: 0, cost: 0 }
      existing.count++
      existing.cost += p.cost
      areaMap.set(dir, existing)
    }
  }

  const areas = Array.from(areaMap.entries())
    .map(([path, { count, cost }]) => ({
      path,
      promptCount: count,
      totalCost: cost,
      isHotspot: count >= 5,
    }))
    .sort((a, b) => b.promptCount - a.promptCount)
    .slice(0, 50)

  return { areas }
}
