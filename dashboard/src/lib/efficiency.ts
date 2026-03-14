export const REQUESTS_PER_DOLLAR_TARGET = 50

export const EFFICIENCY_THRESHOLDS = {
  excellent: 80,
  good: 60,
}

export type EfficiencyInput = {
  cacheReadTokens: number
  inputTokens: number
  requestCount: number
  costUsd: number
}

export type EfficiencyResult = {
  score: number
  cacheEfficiency: number
  costEfficiency: number
  requestsPerDollar: number
}

export const calculateEfficiency = (input: EfficiencyInput): EfficiencyResult => {
  const { cacheReadTokens, inputTokens, requestCount, costUsd } = input

  const totalInput = cacheReadTokens + inputTokens
  const cacheEfficiency = totalInput > 0
    ? cacheReadTokens / totalInput
    : 0

  let costEfficiency = 0.5
  let requestsPerDollar = 0
  if (costUsd > 0) {
    requestsPerDollar = requestCount / costUsd
    costEfficiency = Math.min(1, requestsPerDollar / REQUESTS_PER_DOLLAR_TARGET)
  }

  const score = Math.round(
    (cacheEfficiency * 50) + (costEfficiency * 50)
  )

  return { score, cacheEfficiency, costEfficiency, requestsPerDollar }
}

export const getScoreColor = (score: number): string => {
  if (score >= EFFICIENCY_THRESHOLDS.excellent) return 'text-green-600'
  if (score >= EFFICIENCY_THRESHOLDS.good) return 'text-yellow-600'
  return 'text-red-600'
}

export const getScoreBg = (score: number): string => {
  if (score >= EFFICIENCY_THRESHOLDS.excellent) return 'bg-green-100'
  if (score >= EFFICIENCY_THRESHOLDS.good) return 'bg-yellow-100'
  return 'bg-red-100'
}
