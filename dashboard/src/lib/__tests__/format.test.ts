import { describe, it, expect } from 'vitest'
import {
  formatCost,
  formatCostDetail,
  formatCostChart,
  formatTokens,
  formatDuration,
  shortenModel,
  parseModels,
  formatTime,
} from '@/lib/format'

describe('formatCost', () => {
  it('정수를 2자리 소수점으로 포맷한다', () => {
    expect(formatCost(1)).toBe('$1.00')
    expect(formatCost(100)).toBe('$100.00')
  })

  it('소수를 2자리로 포맷한다', () => {
    expect(formatCost(0.5)).toBe('$0.50')
    expect(formatCost(1.234)).toBe('$1.23')
  })

  it('0을 포맷한다', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('음수를 포맷한다', () => {
    expect(formatCost(-1)).toBe('$-1.00')
  })
})

describe('formatCostDetail', () => {
  it('1 이상이면 2자리 소수점을 사용한다', () => {
    expect(formatCostDetail(1)).toBe('$1.00')
    expect(formatCostDetail(5.678)).toBe('$5.68')
    expect(formatCostDetail(100)).toBe('$100.00')
  })

  it('0.01 이상 1 미만이면 3자리 소수점을 사용한다', () => {
    expect(formatCostDetail(0.01)).toBe('$0.010')
    expect(formatCostDetail(0.5)).toBe('$0.500')
    expect(formatCostDetail(0.999)).toBe('$0.999')
  })

  it('0.01 미만이면 4자리 소수점을 사용한다', () => {
    expect(formatCostDetail(0.001)).toBe('$0.0010')
    expect(formatCostDetail(0.0001)).toBe('$0.0001')
    expect(formatCostDetail(0)).toBe('$0.0000')
  })
})

describe('formatCostChart', () => {
  it('항상 4자리 소수점을 사용한다', () => {
    expect(formatCostChart(1)).toBe('$1.0000')
    expect(formatCostChart(0.1)).toBe('$0.1000')
    expect(formatCostChart(0)).toBe('$0.0000')
    expect(formatCostChart(1.23456)).toBe('$1.2346')
  })
})

describe('formatTokens', () => {
  it('100만 이상이면 M 단위로 포맷한다', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M')
    expect(formatTokens(2_500_000)).toBe('2.5M')
    expect(formatTokens(1_234_567)).toBe('1.2M')
  })

  it('1000 이상이면 K 단위로 포맷한다', () => {
    expect(formatTokens(1_000)).toBe('1.0K')
    expect(formatTokens(1_500)).toBe('1.5K')
    expect(formatTokens(999_999)).toBe('1000.0K')
  })

  it('1000 미만이면 숫자 그대로 반환한다', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(1)).toBe('1')
    expect(formatTokens(999)).toBe('999')
  })
})

describe('formatDuration', () => {
  it('60000ms 이상이면 분 단위로 포맷한다', () => {
    expect(formatDuration(60_000)).toBe('1.0m')
    expect(formatDuration(90_000)).toBe('1.5m')
    expect(formatDuration(120_000)).toBe('2.0m')
  })

  it('1000ms 이상이면 초 단위로 포맷한다', () => {
    expect(formatDuration(1_000)).toBe('1.0s')
    expect(formatDuration(1_500)).toBe('1.5s')
    expect(formatDuration(59_999)).toBe('60.0s')
  })

  it('1000ms 미만이면 ms 단위로 포맷한다', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('소수점 ms는 반올림한다', () => {
    expect(formatDuration(500.6)).toBe('501ms')
    expect(formatDuration(500.4)).toBe('500ms')
  })
})

describe('shortenModel', () => {
  it('claude- 접두사를 제거한다', () => {
    expect(shortenModel('claude-sonnet-4-6')).toBe('sonnet-4-6')
    expect(shortenModel('claude-opus-4-6')).toBe('opus-4-6')
  })

  it('models/ 접두사를 제거한다', () => {
    expect(shortenModel('models/gemini-pro')).toBe('gemini-pro')
  })

  it('날짜 접미사(8자리 숫자)를 제거한다', () => {
    expect(shortenModel('claude-sonnet-20250101')).toBe('sonnet')
    expect(shortenModel('claude-opus-4-6-20240815')).toBe('opus-4-6')
  })

  it('변환이 필요 없는 모델명은 그대로 반환한다', () => {
    expect(shortenModel('gpt-4o')).toBe('gpt-4o')
    expect(shortenModel('')).toBe('')
  })
})

describe('parseModels', () => {
  it('단일 모델을 배열로 반환한다', () => {
    expect(parseModels('claude-sonnet')).toEqual(['claude-sonnet'])
  })

  it('콤마로 구분된 여러 모델을 배열로 반환한다', () => {
    expect(parseModels('claude-sonnet,claude-opus')).toEqual(['claude-sonnet', 'claude-opus'])
  })

  it('공백을 trim한다', () => {
    expect(parseModels('claude-sonnet, claude-opus')).toEqual(['claude-sonnet', 'claude-opus'])
  })

  it('빈 문자열이면 unknown을 반환한다', () => {
    expect(parseModels('')).toEqual(['unknown'])
  })

  it('빈 항목을 필터링한다', () => {
    expect(parseModels('claude-sonnet,,claude-opus')).toEqual(['claude-sonnet', 'claude-opus'])
  })
})

describe('formatTime', () => {
  it('timestamp 문자열을 시:분:초 형식으로 포맷한다', () => {
    const result = formatTime('2024-01-15T10:30:45.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
