export type SuggestionSeverity = 'info' | 'warning' | 'critical'
export type SuggestionCategory = 'cost' | 'cache' | 'tools' | 'performance'

export type Suggestion = {
  id: string
  severity: SuggestionSeverity
  category: SuggestionCategory
  titleKey: string
  descriptionKey: string
  metric: string
  targetKey: string
  actionKey: string
  params: Record<string, string>
}

export type SuggestionInput = {
  overallCacheRate: number
  avgCostPerSession: number
  expensiveModelRatio: number
  toolFailRate: number
  avgSessionDurationMs: number
  totalDailyCost: number
  topFailingTools: Array<{ name: string; failRate: number }>
  modelUsageBreakdown: Array<{ model: string; cost: number; ratio: number }>
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`
const usd = (v: number) => `$${v.toFixed(2)}`

export const generateSuggestions = (input: SuggestionInput): Suggestion[] => {
  const suggestions: Suggestion[] = []

  if (input.overallCacheRate < 0.5) {
    suggestions.push({
      id: 'low_cache_rate',
      severity: input.overallCacheRate < 0.2 ? 'critical' : 'warning',
      category: 'cache',
      titleKey: 'suggestions.lowCacheRate.title',
      descriptionKey: 'suggestions.lowCacheRate.desc',
      metric: pct(input.overallCacheRate),
      targetKey: 'suggestions.lowCacheRate.target',
      actionKey: 'suggestions.lowCacheRate.action',
      params: { rate: pct(input.overallCacheRate) },
    })
  }

  if (input.toolFailRate > 0.15) {
    suggestions.push({
      id: 'high_tool_fail_rate',
      severity: input.toolFailRate > 0.3 ? 'critical' : 'warning',
      category: 'tools',
      titleKey: 'suggestions.highToolFail.title',
      descriptionKey: 'suggestions.highToolFail.desc',
      metric: pct(input.toolFailRate),
      targetKey: 'suggestions.highToolFail.target',
      actionKey: 'suggestions.highToolFail.action',
      params: { rate: pct(input.toolFailRate) },
    })
  }

  if (input.expensiveModelRatio > 0.7) {
    suggestions.push({
      id: 'high_expensive_model_ratio',
      severity: input.expensiveModelRatio > 0.9 ? 'critical' : 'warning',
      category: 'cost',
      titleKey: 'suggestions.expensiveModel.title',
      descriptionKey: 'suggestions.expensiveModel.desc',
      metric: pct(input.expensiveModelRatio),
      targetKey: 'suggestions.expensiveModel.target',
      actionKey: 'suggestions.expensiveModel.action',
      params: { ratio: pct(input.expensiveModelRatio) },
    })
  }

  if (input.avgCostPerSession > 2) {
    suggestions.push({
      id: 'high_avg_session_cost',
      severity: input.avgCostPerSession > 5 ? 'critical' : 'warning',
      category: 'cost',
      titleKey: 'suggestions.highSessionCost.title',
      descriptionKey: 'suggestions.highSessionCost.desc',
      metric: usd(input.avgCostPerSession),
      targetKey: 'suggestions.highSessionCost.target',
      actionKey: 'suggestions.highSessionCost.action',
      params: { cost: usd(input.avgCostPerSession) },
    })
  }

  if (input.totalDailyCost > 10) {
    suggestions.push({
      id: 'high_daily_cost',
      severity: input.totalDailyCost > 20 ? 'critical' : 'warning',
      category: 'performance',
      titleKey: 'suggestions.highDailyCost.title',
      descriptionKey: 'suggestions.highDailyCost.desc',
      metric: usd(input.totalDailyCost),
      targetKey: 'suggestions.highDailyCost.target',
      actionKey: 'suggestions.highDailyCost.action',
      params: { cost: usd(input.totalDailyCost) },
    })
  }

  for (const tool of input.topFailingTools) {
    if (tool.failRate > 0.3) {
      suggestions.push({
        id: `tool_fail_${tool.name}`,
        severity: tool.failRate > 0.5 ? 'critical' : 'warning',
        category: 'tools',
        titleKey: 'suggestions.toolFail.title',
        descriptionKey: 'suggestions.toolFail.desc',
        metric: pct(tool.failRate),
        targetKey: 'suggestions.toolFail.target',
        actionKey: 'suggestions.toolFail.action',
        params: { name: tool.name, rate: pct(tool.failRate) },
      })
    }
  }

  return suggestions
}
