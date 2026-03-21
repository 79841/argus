import type Database from 'better-sqlite3'
import { getDb } from '../db'
import { API_REQUEST_FILTER, agentFilter, agentParams, dateRangeFilter } from './helpers'

export type ProjectRow = {
  project_name: string
  session_count: number
  total_cost: number
}

export type ProjectDetailStats = {
  project_name: string
  total_cost: number
  total_sessions: number
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_tokens: number
  cache_hit_rate: number
  first_activity: string
  last_activity: string
  top_model: string
  agent_breakdown: Array<{ agent_type: string; cost: number; sessions: number }>
}

export type ProjectDailyCost = {
  date: string
  project_name: string
  cost: number
}

export type ProjectComparisonRow = {
  project_name: string
  total_cost: number
  session_count: number
  request_count: number
  top_model: string
  last_activity: string
}

export const getProjects = (): ProjectRow[] => {
  const db = getDb()
  return db.prepare(`
    SELECT
      project_name,
      count(DISTINCT session_id) as session_count,
      COALESCE(sum(cost_usd), 0) as total_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
    GROUP BY project_name
    ORDER BY total_cost DESC
  `).all() as ProjectRow[]
}

export const getProjectCosts = (agentType: string, from?: string, to?: string): ProjectRow[] => {
  const db = getDb()
  const useDate = from && to
  const dateClause = useDate ? dateRangeFilter() : ''
  const dateParams = useDate ? [from, to] : []

  return db.prepare(`
    SELECT
      project_name,
      count(DISTINCT session_id) as session_count,
      COALESCE(sum(cost_usd), 0) as total_cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
      ${dateClause}
      ${agentFilter(agentType)}
    GROUP BY project_name
    ORDER BY total_cost DESC
    LIMIT 20
  `).all(...dateParams, ...agentParams(agentType)) as ProjectRow[]
}

export const getProjectDetailStats = (
  projectName: string,
  dbOverride?: Database.Database
): ProjectDetailStats => {
  const db = dbOverride ?? getDb()

  type StatsRow = {
    total_cost: number
    total_sessions: number
    total_requests: number
    total_input_tokens: number
    total_output_tokens: number
    total_cache_read_tokens: number
    cache_hit_rate: number
    first_activity: string | null
    last_activity: string | null
    top_model: string | null
  }

  const row = db.prepare(`
    SELECT
      COALESCE(sum(cost_usd), 0) as total_cost,
      count(DISTINCT session_id) as total_sessions,
      count(*) as total_requests,
      COALESCE(sum(input_tokens), 0) as total_input_tokens,
      COALESCE(sum(output_tokens), 0) as total_output_tokens,
      COALESCE(sum(cache_read_tokens), 0) as total_cache_read_tokens,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_hit_rate,
      min(timestamp) as first_activity,
      max(timestamp) as last_activity,
      (
        SELECT model FROM agent_logs
        WHERE ${API_REQUEST_FILTER}
          AND project_name = ?
          AND model != ''
        GROUP BY model
        ORDER BY count(*) DESC
        LIMIT 1
      ) as top_model
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name = ?
  `).get(projectName, projectName) as StatsRow | undefined

  type BreakdownRow = { agent_type: string; cost: number; sessions: number }

  const breakdown = db.prepare(`
    SELECT
      agent_type,
      COALESCE(sum(cost_usd), 0) as cost,
      count(DISTINCT session_id) as sessions
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name = ?
    GROUP BY agent_type
    ORDER BY cost DESC
  `).all(projectName) as BreakdownRow[]

  return {
    project_name: projectName,
    total_cost: row?.total_cost ?? 0,
    total_sessions: row?.total_sessions ?? 0,
    total_requests: row?.total_requests ?? 0,
    total_input_tokens: row?.total_input_tokens ?? 0,
    total_output_tokens: row?.total_output_tokens ?? 0,
    total_cache_read_tokens: row?.total_cache_read_tokens ?? 0,
    cache_hit_rate: row?.cache_hit_rate ?? 0,
    first_activity: row?.first_activity ?? '',
    last_activity: row?.last_activity ?? '',
    top_model: row?.top_model ?? '',
    agent_breakdown: breakdown,
  }
}

export const getProjectDailyCosts = (
  days: number = 30,
  dbOverride?: Database.Database
): ProjectDailyCost[] => {
  const db = dbOverride ?? getDb()

  return db.prepare(`
    SELECT
      date(timestamp) as date,
      project_name,
      COALESCE(sum(cost_usd), 0) as cost
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
      AND date(timestamp) >= date('now', '-' || ? || ' days')
    GROUP BY date(timestamp), project_name
    ORDER BY date ASC, cost DESC
  `).all(days) as ProjectDailyCost[]
}

export const getProjectComparison = (
  dbOverride?: Database.Database
): ProjectComparisonRow[] => {
  const db = dbOverride ?? getDb()

  return db.prepare(`
    SELECT
      project_name,
      COALESCE(sum(cost_usd), 0) as total_cost,
      count(DISTINCT session_id) as session_count,
      count(*) as request_count,
      (
        SELECT m.model FROM agent_logs m
        WHERE m.project_name = agent_logs.project_name
          AND m.${API_REQUEST_FILTER}
          AND m.model != ''
        GROUP BY m.model
        ORDER BY count(*) DESC
        LIMIT 1
      ) as top_model,
      max(timestamp) as last_activity
    FROM agent_logs
    WHERE ${API_REQUEST_FILTER}
      AND project_name != ''
    GROUP BY project_name
    ORDER BY total_cost DESC
  `).all() as ProjectComparisonRow[]
}
