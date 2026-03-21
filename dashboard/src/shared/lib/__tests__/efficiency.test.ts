import { describe, it, expect } from 'vitest'
import {
  calculateEfficiency,
  getScoreColor,
  getScoreBg,
  EFFICIENCY_THRESHOLDS,
  REQUESTS_PER_DOLLAR_TARGET,
} from '@/features/usage/lib/efficiency'
import type { EfficiencyInput } from '@/features/usage/lib/efficiency'

const baseInput: EfficiencyInput = {
  cacheReadTokens: 0,
  inputTokens: 100,
  outputTokens: 50,
  requestCount: 10,
  costUsd: 0.2,
  totalDurationMs: 10_000,
}

describe('EFFICIENCY_THRESHOLDS', () => {
  it('excellent 임계값은 80이다', () => {
    expect(EFFICIENCY_THRESHOLDS.excellent).toBe(80)
  })

  it('good 임계값은 60이다', () => {
    expect(EFFICIENCY_THRESHOLDS.good).toBe(60)
  })
})

describe('REQUESTS_PER_DOLLAR_TARGET', () => {
  it('50이다', () => {
    expect(REQUESTS_PER_DOLLAR_TARGET).toBe(50)
  })
})

describe('calculateEfficiency', () => {
  it('기본 입력으로 score를 계산한다', () => {
    const result = calculateEfficiency(baseInput)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('캐시 토큰이 없으면 cacheEfficiency는 0이다', () => {
    const result = calculateEfficiency({ ...baseInput, cacheReadTokens: 0 })
    expect(result.cacheEfficiency).toBe(0)
  })

  it('캐시 토큰이 있으면 cacheEfficiency를 계산한다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 50,
      inputTokens: 50,
    })
    expect(result.cacheEfficiency).toBe(0.5)
  })

  it('모든 입력이 캐시이면 cacheEfficiency는 1이다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 100,
      inputTokens: 0,
    })
    expect(result.cacheEfficiency).toBe(1)
  })

  it('costUsd가 0이면 costEfficiency는 0.5이다', () => {
    const result = calculateEfficiency({ ...baseInput, costUsd: 0 })
    expect(result.costEfficiency).toBe(0.5)
    expect(result.requestsPerDollar).toBe(0)
  })

  it('costUsd가 0이면 score는 cacheEfficiency * 50 + 0.5 * 50이다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 0,
      inputTokens: 100,
      costUsd: 0,
    })
    expect(result.score).toBe(Math.round(0 * 50 + 0.5 * 50))
  })

  it('requestsPerDollar가 target을 초과하면 costEfficiency는 1로 제한한다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      requestCount: 1000,
      costUsd: 0.01,
    })
    expect(result.costEfficiency).toBe(1)
  })

  it('requestCount가 0이면 avgDurationMs는 0이다', () => {
    const result = calculateEfficiency({ ...baseInput, requestCount: 0, costUsd: 0 })
    expect(result.avgDurationMs).toBe(0)
  })

  it('avgDurationMs를 올바르게 계산한다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      requestCount: 5,
      totalDurationMs: 10_000,
    })
    expect(result.avgDurationMs).toBe(2_000)
  })

  it('tokenEfficiency를 계산한다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 0,
      inputTokens: 100,
      outputTokens: 50,
    })
    expect(result.tokenEfficiency).toBe(0.5)
  })

  it('tokenEfficiency는 1을 초과하지 않는다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 0,
      inputTokens: 10,
      outputTokens: 1000,
    })
    expect(result.tokenEfficiency).toBe(1)
  })

  it('totalInput이 0이면 tokenEfficiency는 0이다', () => {
    const result = calculateEfficiency({
      ...baseInput,
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 50,
    })
    expect(result.tokenEfficiency).toBe(0)
  })

  it('score 0 경계값: 모든 효율이 최솟값인 경우', () => {
    const result = calculateEfficiency({
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      requestCount: 0,
      costUsd: 0,
      totalDurationMs: 0,
    })
    expect(result.score).toBe(Math.round(0 * 50 + 0.5 * 50))
  })

  it('score 100 경계값: 캐시 100% + 비용 효율 100%인 경우', () => {
    const result = calculateEfficiency({
      cacheReadTokens: 100,
      inputTokens: 0,
      outputTokens: 50,
      requestCount: 100,
      costUsd: 1,
      totalDurationMs: 10_000,
    })
    expect(result.score).toBe(100)
    expect(result.cacheEfficiency).toBe(1)
    expect(result.costEfficiency).toBe(1)
  })
})

describe('getScoreColor', () => {
  it('80 이상이면 green 색상을 반환한다', () => {
    expect(getScoreColor(80)).toBe('text-green-600')
    expect(getScoreColor(100)).toBe('text-green-600')
    expect(getScoreColor(90)).toBe('text-green-600')
  })

  it('60 이상 80 미만이면 yellow 색상을 반환한다', () => {
    expect(getScoreColor(60)).toBe('text-yellow-600')
    expect(getScoreColor(79)).toBe('text-yellow-600')
    expect(getScoreColor(70)).toBe('text-yellow-600')
  })

  it('60 미만이면 red 색상을 반환한다', () => {
    expect(getScoreColor(0)).toBe('text-red-600')
    expect(getScoreColor(59)).toBe('text-red-600')
    expect(getScoreColor(30)).toBe('text-red-600')
  })
})

describe('getScoreBg', () => {
  it('80 이상이면 green 배경을 반환한다', () => {
    expect(getScoreBg(80)).toBe('bg-green-100')
    expect(getScoreBg(100)).toBe('bg-green-100')
  })

  it('60 이상 80 미만이면 yellow 배경을 반환한다', () => {
    expect(getScoreBg(60)).toBe('bg-yellow-100')
    expect(getScoreBg(79)).toBe('bg-yellow-100')
  })

  it('60 미만이면 red 배경을 반환한다', () => {
    expect(getScoreBg(0)).toBe('bg-red-100')
    expect(getScoreBg(59)).toBe('bg-red-100')
  })
})
