import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, sanitizeAgentType } from './helpers'

export type HeartbeatPoint = {
  minute: string
  agent_type: string
  total_tokens: number
}

export const getHeartbeatData = (agentType: string, minutes: number): HeartbeatPoint[] => {
  const db = getDb()
  const sanitized = sanitizeAgentType(agentType)
  const filter = agentFilter(sanitized)
  const params = agentParams(sanitized)

  return db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:%M', timestamp) as minute,
              agent_type,
              COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
       FROM agent_logs
       WHERE ${API_REQUEST_FILTER}
         AND timestamp > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-' || ? || ' minutes')
         ${filter}
       GROUP BY minute, agent_type
       ORDER BY minute ASC`,
    )
    .all(minutes, ...params) as HeartbeatPoint[]
}
