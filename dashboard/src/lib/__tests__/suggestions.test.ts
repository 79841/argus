import { describe, it, expect } from 'vitest'
import { generateSuggestions } from '../suggestions'
import type { SuggestionInput } from '../suggestions'

const BASE_INPUT: SuggestionInput = {
  overallCacheRate: 0.7,
  avgCostPerSession: 0.5,
  expensiveModelRatio: 0.3,
  toolFailRate: 0.05,
  avgSessionDurationMs: 60_000,
  totalDailyCost: 3,
  topFailingTools: [],
  modelUsageBreakdown: [],
}

describe('generateSuggestions', () => {
  it('캐시 히트율 < 50% 이면 cache 제안을 생성한다', () => {
    const input: SuggestionInput = { ...BASE_INPUT, overallCacheRate: 0.3 }
    const result = generateSuggestions(input)
    const cacheSuggestion = result.find(s => s.category === 'cache')
    expect(cacheSuggestion).toBeDefined()
    expect(cacheSuggestion?.id).toBe('low_cache_rate')
    expect(cacheSuggestion?.title).toBeTruthy()
    expect(cacheSuggestion?.description).toContain('30%')
  })

  it('도구 실패율 > 15% 이면 tools 제안을 생성한다', () => {
    const input: SuggestionInput = { ...BASE_INPUT, toolFailRate: 0.2 }
    const result = generateSuggestions(input)
    const toolsSuggestion = result.find(s => s.category === 'tools' && s.id === 'high_tool_fail_rate')
    expect(toolsSuggestion).toBeDefined()
    expect(toolsSuggestion?.severity).toBe('warning')
    expect(toolsSuggestion?.description).toContain('20%')
  })

  it('고가 모델 비율 > 70% 이면 cost 제안을 생성한다', () => {
    const input: SuggestionInput = { ...BASE_INPUT, expensiveModelRatio: 0.8 }
    const result = generateSuggestions(input)
    const costSuggestion = result.find(s => s.id === 'high_expensive_model_ratio')
    expect(costSuggestion).toBeDefined()
    expect(costSuggestion?.category).toBe('cost')
    expect(costSuggestion?.description).toContain('80%')
  })

  it('모든 지표가 양호하면 빈 배열을 반환한다', () => {
    const result = generateSuggestions(BASE_INPUT)
    expect(result).toHaveLength(0)
  })

  it('여러 조건이 동시에 충족되면 복수 제안을 생성한다', () => {
    const input: SuggestionInput = {
      ...BASE_INPUT,
      overallCacheRate: 0.2,
      toolFailRate: 0.25,
      expensiveModelRatio: 0.9,
    }
    const result = generateSuggestions(input)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('severity 를 올바르게 분류한다', () => {
    const input: SuggestionInput = {
      ...BASE_INPUT,
      overallCacheRate: 0.1,
      totalDailyCost: 15,
      avgCostPerSession: 3,
    }
    const result = generateSuggestions(input)
    const hasCritical = result.some(s => s.severity === 'critical')
    const hasWarning = result.some(s => s.severity === 'warning')
    expect(hasCritical || hasWarning).toBe(true)
  })

  it('세션 평균 비용 > $2 이면 cost 제안을 생성한다', () => {
    const input: SuggestionInput = { ...BASE_INPUT, avgCostPerSession: 2.5 }
    const result = generateSuggestions(input)
    const costSuggestion = result.find(s => s.id === 'high_avg_session_cost')
    expect(costSuggestion).toBeDefined()
    expect(costSuggestion?.metric).toContain('$2.50')
  })

  it('일일 비용 > $10 이면 performance 제안을 생성한다', () => {
    const input: SuggestionInput = { ...BASE_INPUT, totalDailyCost: 12 }
    const result = generateSuggestions(input)
    const dailyCostSuggestion = result.find(s => s.id === 'high_daily_cost')
    expect(dailyCostSuggestion).toBeDefined()
    expect(dailyCostSuggestion?.severity).toBe('warning')
  })

  it('특정 도구 실패율 > 30% 이면 해당 도구명이 제안에 포함된다', () => {
    const input: SuggestionInput = {
      ...BASE_INPUT,
      topFailingTools: [{ name: 'bash', failRate: 0.45 }],
    }
    const result = generateSuggestions(input)
    const toolSuggestion = result.find(s => s.id.startsWith('tool_fail_'))
    expect(toolSuggestion).toBeDefined()
    expect(toolSuggestion?.description).toContain('bash')
  })

  it('각 제안이 필수 필드를 모두 갖는다', () => {
    const input: SuggestionInput = {
      ...BASE_INPUT,
      overallCacheRate: 0.1,
      toolFailRate: 0.2,
    }
    const result = generateSuggestions(input)
    for (const s of result) {
      expect(s.id).toBeTruthy()
      expect(['info', 'warning', 'critical']).toContain(s.severity)
      expect(['cost', 'cache', 'tools', 'performance']).toContain(s.category)
      expect(s.title).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.metric).toBeTruthy()
      expect(s.target).toBeTruthy()
      expect(s.action).toBeTruthy()
    }
  })
})
