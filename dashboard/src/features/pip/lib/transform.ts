export type HeartbeatRaw = {
  minute: string
  agent_type: string
  total_tokens: number
}

export type ChartDataPoint = {
  minute: string
  claude: number
  codex: number
  gemini: number
}

const formatMinute = (iso: string): string => {
  const parts = iso.split('T')
  return parts[1] ?? iso.slice(-5)
}

const generateMinuteRange = (minutes: number): string[] => {
  const now = new Date()
  now.setSeconds(0, 0)
  const result: string[] = []
  for (let i = minutes - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 1000)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    result.push(`${hh}:${mm}`)
  }
  return result
}

export const transformHeartbeat = (rows: HeartbeatRaw[], minutes: number): ChartDataPoint[] => {
  const minuteRange = generateMinuteRange(minutes)

  const map: Record<string, ChartDataPoint> = {}
  for (const label of minuteRange) {
    map[label] = { minute: label, claude: 0, codex: 0, gemini: 0 }
  }

  for (const row of rows) {
    const label = formatMinute(row.minute)
    if (!map[label]) continue
    const agent = row.agent_type as keyof Omit<ChartDataPoint, 'minute'>
    if (agent === 'claude' || agent === 'codex' || agent === 'gemini') {
      map[label][agent] += row.total_tokens
    }
  }

  return minuteRange.map((label) => map[label])
}
