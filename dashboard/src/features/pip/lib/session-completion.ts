import { AGENTS } from '@/shared/lib/agents'
import { formatCostDetail, formatDuration } from '@/shared/lib/format'
import type { AgentType } from '@/shared/lib/agents'
import type { ActiveSessionInfo } from '@/shared/types/api'

const DEFAULT_THRESHOLD_MS = 60_000

export type SessionSummary = {
  agentType: string
  cost: number
  eventCount: number
  durationMs: number
}

export const detectCompletedSessions = (
  prevSessions: ActiveSessionInfo[] | undefined,
  currSessions: ActiveSessionInfo[],
  thresholdMs = DEFAULT_THRESHOLD_MS
): ActiveSessionInfo[] => {
  if (!prevSessions) return []

  const currIds = new Set(currSessions.map((s) => s.session_id))
  const now = Date.now()

  const disappeared = prevSessions.filter((s) => !currIds.has(s.session_id))

  const prevIds = new Set(prevSessions.map((s) => s.session_id))
  const stale = currSessions.filter((s) => {
    if (!prevIds.has(s.session_id)) return false
    return now - new Date(s.last_event).getTime() >= thresholdMs
  })

  const disappearedIds = new Set(disappeared.map((s) => s.session_id))
  return [...disappeared, ...stale.filter((s) => !disappearedIds.has(s.session_id))]
}

export const formatNotificationText = (
  summary: SessionSummary,
  t: (key: string, params?: Record<string, string>) => string
): { title: string; body: string } => {
  const agent = AGENTS[summary.agentType as AgentType]
  const agentName = agent?.name ?? summary.agentType
  return {
    title: t('pip.session.complete', { agent: agentName }),
    body: t('pip.session.summary', {
      cost: formatCostDetail(summary.cost),
      count: String(summary.eventCount),
      duration: formatDuration(summary.durationMs),
    }),
  }
}

export const buildSessionSummary = (session: ActiveSessionInfo): SessionSummary => {
  const lastEventMs = new Date(session.last_event).getTime()
  const durationMs = Math.max(0, Date.now() - lastEventMs)

  return {
    agentType: session.agent_type,
    cost: session.cost,
    eventCount: session.event_count,
    durationMs,
  }
}
