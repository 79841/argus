import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { SessionRow, SessionDetailEvent, SessionSummary } from '@/shared/lib/queries'

type SessionDetailWithSummary = {
  summary: SessionSummary | null
  events: SessionDetailEvent[]
}

type ActiveSessionsResponse = {
  sessions?: unknown[]
}

export const sessionsService = {
  getSessions: (params?: QueryParams): Promise<SessionRow[]> =>
    dataClient.query('sessions', params) as Promise<SessionRow[]>,

  getSessionDetail: (id: string, params?: QueryParams): Promise<SessionDetailWithSummary | SessionDetailEvent[]> =>
    dataClient.query(`sessions/${encodeURIComponent(id)}`, params) as Promise<SessionDetailWithSummary | SessionDetailEvent[]>,

  getActiveSessions: (): Promise<ActiveSessionsResponse> =>
    dataClient.query('sessions/active') as Promise<ActiveSessionsResponse>,
}
