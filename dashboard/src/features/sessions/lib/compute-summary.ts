import { computeCacheRate } from '@/shared/lib/format'
import type { SessionRow, SessionDetailEvent } from '@/shared/lib/queries'

export type SessionSummary = {
  agentType: string
  model: string
  totalCost: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  wallTime: number
  requestCount: number
  toolCallCount: number
  cacheRate: number
}

export const computeSummary = (events: SessionDetailEvent[], session: SessionRow): SessionSummary => {
  const apiEvents = events.filter((e) => e.event_name === 'api_request')
  const toolEvents = events.filter((e) => e.event_name === 'tool_result')
  const totalInput = apiEvents.reduce((s, e) => s + (e.input_tokens || 0), 0)
  const totalCache = apiEvents.reduce((s, e) => s + (e.cache_read_tokens || 0), 0)
  const cacheRate = Math.round(computeCacheRate(totalInput, totalCache))
  return {
    agentType: session.agent_type,
    model: session.model,
    totalCost: apiEvents.reduce((s, e) => s + (e.cost_usd || 0), 0),
    inputTokens: totalInput,
    outputTokens: apiEvents.reduce((s, e) => s + (e.output_tokens || 0), 0),
    cacheReadTokens: totalCache,
    wallTime: session.duration_ms,
    requestCount: apiEvents.length,
    toolCallCount: toolEvents.length,
    cacheRate,
  }
}
