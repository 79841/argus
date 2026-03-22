export const REQUESTS_PER_DOLLAR_TARGET = 50

export const EFFICIENCY_THRESHOLDS = {
  excellent: 80,
  good: 60,
}

export type EfficiencyInput = {
  cacheReadTokens: number
  inputTokens: number
  outputTokens: number
  requestCount: number
  costUsd: number
  totalDurationMs: number
}

export type EfficiencyResult = {
  score: number
  cacheEfficiency: number
  costEfficiency: number
  requestsPerDollar: number
  tokenEfficiency: number
  avgDurationMs: number
}

export const calculateEfficiency = (input: EfficiencyInput): EfficiencyResult => {
  const { cacheReadTokens, inputTokens, outputTokens, requestCount, costUsd, totalDurationMs } = input

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

  const tokenEfficiency = totalInput > 0
    ? Math.min(1, outputTokens / totalInput)
    : 0

  const avgDurationMs = requestCount > 0
    ? totalDurationMs / requestCount
    : 0

  const score = Math.round(
    (cacheEfficiency * 50) + (costEfficiency * 50)
  )

  return { score, cacheEfficiency, costEfficiency, requestsPerDollar, tokenEfficiency, avgDurationMs }
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
