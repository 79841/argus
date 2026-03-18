export const PROMPT_CATEGORIES = {
  bug_fix: { label: '버그 수정', keywords: ['fix', 'bug', 'error', '수정', '오류', '에러', 'broken', 'issue', 'crash', 'debug'] },
  feature: { label: '기능 추가', keywords: ['add', 'create', 'implement', '추가', '구현', '생성', 'new', 'feature', 'build'] },
  refactor: { label: '리팩토링', keywords: ['refactor', 'clean', 'reorganize', '리팩토링', '정리', 'restructure', 'simplify', 'move', 'rename'] },
  question: { label: '질문', keywords: ['what', 'how', 'why', 'explain', '무엇', '어떻게', '왜', '설명', '?', 'tell me', '알려'] },
  review: { label: '코드 리뷰', keywords: ['review', 'check', 'look at', '리뷰', '검토', '확인', 'inspect'] },
  test: { label: '테스트', keywords: ['test', 'spec', 'assert', '테스트', '검증', 'vitest', 'jest'] },
  docs: { label: '문서', keywords: ['document', 'readme', 'comment', '문서', '주석', 'jsdoc'] },
  config: { label: '설정', keywords: ['config', 'setup', 'install', '설정', '설치', 'env', 'docker', 'deploy'] },
} as const

export type PromptCategory = keyof typeof PROMPT_CATEGORIES

export const classifyPrompt = (text: string): PromptCategory => {
  const lower = text.toLowerCase()
  let best: PromptCategory = 'question'
  let bestCount = 0

  for (const [category, { keywords }] of Object.entries(PROMPT_CATEGORIES)) {
    const count = keywords.filter(kw => lower.includes(kw)).length
    if (count > bestCount) {
      bestCount = count
      best = category as PromptCategory
    }
  }
  return best
}

export type ComplexityScore = {
  score: number
  level: 'simple' | 'moderate' | 'complex'
  factors: {
    length: number
    codeRatio: number
    specificity: number
    multiStep: number
  }
}

export const calculateComplexity = (text: string): ComplexityScore => {
  const len = text.length
  const length = len < 100 ? 5 : len < 300 ? 10 : len < 500 ? 15 : len < 1000 ? 20 : 25

  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length
  const inlineCode = (text.match(/`[^`]+`/g) || []).length
  const codeRatio = Math.min(25, (codeBlocks * 10 + inlineCode * 3))

  const filePaths = (text.match(/[\w.-]+\/[\w.-]+(?:\.\w+)?/g) || []).length
  const funcNames = (text.match(/(?:function|class|const|def|export)\s+\w+/g) || []).length
  const specificity = Math.min(25, filePaths * 8 + funcNames * 5)

  const multiStepIndicators = ['그리고', '다음으로', '또한', 'then', 'also', 'next', 'after that']
  const numberedList = (text.match(/^\s*\d+[\.)]/gm) || []).length
  const multiStep = Math.min(25, multiStepIndicators.filter(i => text.toLowerCase().includes(i)).length * 5 + numberedList * 4)

  const score = length + codeRatio + specificity + multiStep
  const level = score < 30 ? 'simple' : score < 60 ? 'moderate' : 'complex'

  return { score, level, factors: { length, codeRatio, specificity, multiStep } }
}

export type EffectivenessScore = {
  score: number
  level: 'excellent' | 'good' | 'needs_improvement'
  insights: string[]
}

export const calculateEffectiveness = (prompt: {
  text: string
  complexity: ComplexityScore
  sessionCost: number
  sessionTurns: number
  toolSuccessRate: number
}): EffectivenessScore => {
  const insights: string[] = []
  let score = 50

  if (prompt.toolSuccessRate >= 0.9) score += 20
  else if (prompt.toolSuccessRate >= 0.7) score += 10
  else { score -= 10; insights.push('도구 성공률이 낮습니다') }

  if (prompt.sessionTurns <= 3) score += 15
  else if (prompt.sessionTurns <= 8) score += 5
  else { score -= 10; insights.push('세션 턴이 많습니다 — 프롬프트를 더 구체적으로 작성하세요') }

  if (prompt.complexity.factors.specificity >= 15) {
    score += 10
    insights.push('파일 경로/함수명이 포함되어 효과적입니다')
  }

  if (prompt.sessionCost > 2) {
    score -= 15
    insights.push('세션 비용이 높습니다')
  }

  score = Math.max(0, Math.min(100, score))
  const level = score >= 75 ? 'excellent' : score >= 50 ? 'good' : 'needs_improvement'
  return { score, level, insights }
}

export type FailureReason = 'ambiguous_prompt' | 'agent_limitation' | 'complexity_exceeded' | 'context_switch'

export type FailureAnalysis = {
  isFailure: boolean
  reason: FailureReason | null
  confidence: number
  recommendation: string
  suggestedAgent: string | null
}

export const analyzeSessionFailure = (session: {
  totalCost: number
  turnCount: number
  toolSuccessRate: number
  errorRate: number
  promptCategories: PromptCategory[]
  avgComplexity: number
}): FailureAnalysis => {
  const { totalCost, turnCount, toolSuccessRate, errorRate, promptCategories, avgComplexity } = session

  const isFailure = (totalCost > 1 && toolSuccessRate < 0.5) ||
    (turnCount > 15 && toolSuccessRate < 0.6) ||
    errorRate > 0.3

  if (!isFailure) {
    return { isFailure: false, reason: null, confidence: 0, recommendation: '', suggestedAgent: null }
  }

  const uniqueCategories = new Set(promptCategories).size

  if (uniqueCategories >= 3) {
    return {
      isFailure: true,
      reason: 'context_switch',
      confidence: 0.7,
      recommendation: '세션 내 주제가 자주 변경됩니다. 작업별로 세션을 분리하세요.',
      suggestedAgent: null,
    }
  }

  if (avgComplexity < 30 && turnCount > 10) {
    return {
      isFailure: true,
      reason: 'ambiguous_prompt',
      confidence: 0.8,
      recommendation: '프롬프트가 모호합니다. 파일 경로, 함수명 등 구체적 정보를 포함하세요.',
      suggestedAgent: null,
    }
  }

  if (toolSuccessRate < 0.4) {
    const hasBugFix = promptCategories.includes('bug_fix')
    return {
      isFailure: true,
      reason: 'agent_limitation',
      confidence: 0.7,
      recommendation: '현재 에이전트가 이 작업에 적합하지 않을 수 있습니다.',
      suggestedAgent: hasBugFix ? 'codex' : 'claude',
    }
  }

  return {
    isFailure: true,
    reason: 'complexity_exceeded',
    confidence: 0.6,
    recommendation: '작업 복잡도가 높습니다. 더 작은 단위로 분할하세요.',
    suggestedAgent: null,
  }
}
