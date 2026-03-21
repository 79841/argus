import type { SessionDetailEvent } from '@/shared/lib/queries'

export type ModelCostBreakdown = {
  model: string
  cost: number
  percentage: number
  request_count: number
  input_tokens: number
  output_tokens: number
}

export const computeModelCostBreakdown = (events: SessionDetailEvent[]): ModelCostBreakdown[] => {
  const apiEvents = events.filter((e) => e.event_name === 'api_request')
  if (apiEvents.length === 0) return []

  const map = new Map<string, { cost: number; request_count: number; input_tokens: number; output_tokens: number }>()

  for (const ev of apiEvents) {
    const key = ev.model || 'unknown'
    const existing = map.get(key)
    if (existing) {
      existing.cost += ev.cost_usd || 0
      existing.request_count += 1
      existing.input_tokens += ev.input_tokens || 0
      existing.output_tokens += ev.output_tokens || 0
    } else {
      map.set(key, {
        cost: ev.cost_usd || 0,
        request_count: 1,
        input_tokens: ev.input_tokens || 0,
        output_tokens: ev.output_tokens || 0,
      })
    }
  }

  const totalCost = Array.from(map.values()).reduce((sum, v) => sum + v.cost, 0)

  const result: ModelCostBreakdown[] = Array.from(map.entries()).map(([model, data]) => ({
    model,
    cost: data.cost,
    percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    request_count: data.request_count,
    input_tokens: data.input_tokens,
    output_tokens: data.output_tokens,
  }))

  return result.sort((a, b) => b.cost - a.cost)
}
