import type { SessionDetailEvent } from './queries'

export type WaterfallGroup = {
  promptId: string
  events: SessionDetailEvent[]
  cost: number
  startTime: string
}

export type TimeScale = {
  startMs: number
  endMs: number
  totalMs: number
}

export type BarPosition = {
  left: number
  width: number
}

const MIN_BAR_WIDTH_PCT = 0.5

export const groupEventsForWaterfall = (events: SessionDetailEvent[]): WaterfallGroup[] => {
  if (events.length === 0) return []

  const map = new Map<string, SessionDetailEvent[]>()
  const order: string[] = []

  for (const ev of events) {
    const key = ev.prompt_id || `_no_prompt_${ev.timestamp}`
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(ev)
  }

  return order.map((promptId) => {
    const evts = map.get(promptId)!
    return {
      promptId,
      events: evts,
      cost: evts.reduce((s, e) => s + (e.cost_usd || 0), 0),
      startTime: evts[0].timestamp,
    }
  })
}

export const calculateTimeScale = (events: SessionDetailEvent[]): TimeScale => {
  if (events.length === 0) return { startMs: 0, endMs: 0, totalMs: 0 }

  let minMs = Infinity
  let maxMs = -Infinity

  for (const ev of events) {
    const startMs = new Date(ev.timestamp).getTime()
    const endMs = startMs + (ev.duration_ms || 0)
    if (startMs < minMs) minMs = startMs
    if (endMs > maxMs) maxMs = endMs
  }

  if (maxMs <= minMs) {
    maxMs = minMs + 1000
  }

  return {
    startMs: minMs,
    endMs: maxMs,
    totalMs: maxMs - minMs,
  }
}

export const calculateBarPosition = (event: SessionDetailEvent, scale: TimeScale): BarPosition => {
  if (scale.totalMs === 0) {
    return { left: 0, width: MIN_BAR_WIDTH_PCT }
  }

  const eventStartMs = new Date(event.timestamp).getTime()
  const durationMs = event.duration_ms || 0

  const left = Math.max(0, ((eventStartMs - scale.startMs) / scale.totalMs) * 100)
  const rawWidth = (durationMs / scale.totalMs) * 100
  const width = Math.max(MIN_BAR_WIDTH_PCT, rawWidth)

  const clampedWidth = Math.min(width, 100 - left)

  return { left, width: clampedWidth }
}
