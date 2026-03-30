import type { HeartbeatRaw } from './transform'

export type ChartPoint = {
  tick: number
  claude: number
  codex: number
  gemini: number
}

const AGENTS = ['claude', 'codex', 'gemini'] as const

export const emptyPoint = (): ChartPoint => ({ tick: 0, claude: 0, codex: 0, gemini: 0 })

export const toLocalMinuteKey = (iso: string): string => {
  const d = new Date(iso + ':00Z')
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const buildMinuteMap = (rows: HeartbeatRaw[]): Map<string, Record<string, number>> => {
  const map = new Map<string, Record<string, number>>()
  for (const row of rows) {
    const key = toLocalMinuteKey(row.minute)
    const agent = row.agent_type
    if (!AGENTS.includes(agent as typeof AGENTS[number])) continue
    const existing = map.get(key)
    if (existing) {
      existing[agent] = (existing[agent] ?? 0) + row.total_tokens
    } else {
      map.set(key, { [agent]: row.total_tokens })
    }
  }
  return map
}

export const getPointForMinute = (
  minuteMap: Map<string, Record<string, number>>,
  minuteKey: string
): ChartPoint => {
  const data = minuteMap.get(minuteKey)
  if (!data) return emptyPoint()
  return {
    tick: 0,
    claude: data.claude ?? 0,
    codex: data.codex ?? 0,
    gemini: data.gemini ?? 0,
  }
}

export const currentMinuteKey = (): string => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
