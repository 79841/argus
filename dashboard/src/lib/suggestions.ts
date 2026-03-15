export type SuggestionSeverity = 'info' | 'warning' | 'critical'
export type SuggestionCategory = 'cost' | 'cache' | 'tools' | 'performance'

export type Suggestion = {
  id: string
  severity: SuggestionSeverity
  category: SuggestionCategory
  title: string
  description: string
  metric: string
  target: string
  action: string
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
      title: '캐시 히트율 개선 필요',
      description: `캐시 히트율이 ${pct(input.overallCacheRate)}로 낮습니다. CLAUDE.md에 컨텍스트 힌트를 추가하면 캐시 재사용률을 높일 수 있습니다.`,
      metric: pct(input.overallCacheRate),
      target: '50% 이상',
      action: 'CLAUDE.md에 자주 쓰이는 컨텍스트(프로젝트 구조, 코딩 규칙 등)를 추가하세요.',
    })
  }

  if (input.toolFailRate > 0.15) {
    suggestions.push({
      id: 'high_tool_fail_rate',
      severity: input.toolFailRate > 0.3 ? 'critical' : 'warning',
      category: 'tools',
      title: '도구 실패율이 높습니다',
      description: `도구 실패율이 ${pct(input.toolFailRate)}입니다. 도구 설정 및 권한을 확인하세요.`,
      metric: pct(input.toolFailRate),
      target: '15% 미만',
      action: '실패율이 높은 도구의 권한과 경로 설정을 검토하세요.',
    })
  }

  if (input.expensiveModelRatio > 0.7) {
    suggestions.push({
      id: 'high_expensive_model_ratio',
      severity: input.expensiveModelRatio > 0.9 ? 'critical' : 'warning',
      category: 'cost',
      title: '고가 모델 사용 비율이 높습니다',
      description: `고가 모델(opus 계열) 사용 비율이 ${pct(input.expensiveModelRatio)}입니다. 단순 작업에는 sonnet을 사용하면 비용을 절감할 수 있습니다.`,
      metric: pct(input.expensiveModelRatio),
      target: '70% 미만',
      action: '반복적이거나 단순한 작업은 claude-sonnet 모델을 사용하도록 설정하세요.',
    })
  }

  if (input.avgCostPerSession > 2) {
    suggestions.push({
      id: 'high_avg_session_cost',
      severity: input.avgCostPerSession > 5 ? 'critical' : 'warning',
      category: 'cost',
      title: '세션 평균 비용이 높습니다',
      description: `세션당 평균 비용이 ${usd(input.avgCostPerSession)}입니다. 프롬프트를 구체적으로 작성하면 불필요한 왕복 요청을 줄일 수 있습니다.`,
      metric: usd(input.avgCostPerSession),
      target: '$2.00 미만',
      action: '프롬프트를 명확하고 구체적으로 작성해 불필요한 추가 요청을 줄이세요.',
    })
  }

  if (input.totalDailyCost > 10) {
    suggestions.push({
      id: 'high_daily_cost',
      severity: input.totalDailyCost > 20 ? 'critical' : 'warning',
      category: 'performance',
      title: '일일 비용이 높습니다',
      description: `오늘 총 비용이 ${usd(input.totalDailyCost)}입니다. 예산 한도를 설정하는 것을 권장합니다.`,
      metric: usd(input.totalDailyCost),
      target: '$10.00 미만',
      action: 'Settings 페이지에서 에이전트별 일일 예산 한도를 설정하세요.',
    })
  }

  for (const tool of input.topFailingTools) {
    if (tool.failRate > 0.3) {
      suggestions.push({
        id: `tool_fail_${tool.name}`,
        severity: tool.failRate > 0.5 ? 'critical' : 'warning',
        category: 'tools',
        title: `${tool.name} 도구 실패율이 높습니다`,
        description: `${tool.name} 실패율이 ${pct(tool.failRate)}입니다. 권한 및 경로 설정을 확인하세요.`,
        metric: pct(tool.failRate),
        target: '30% 미만',
        action: `${tool.name} 도구의 실행 권한, 경로, 환경 설정을 점검하세요.`,
      })
    }
  }

  return suggestions
}
