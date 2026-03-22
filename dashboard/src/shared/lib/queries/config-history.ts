import { getDb } from '../db'

export type ConfigComparePeriod = {
  avg_cost: number
  cache_rate: number
  tool_fail_rate: number
  request_count: number
}

export type ConfigCompareResult = {
  before: ConfigComparePeriod
  after: ConfigComparePeriod
}

const emptyPeriod: ConfigComparePeriod = { avg_cost: 0, cache_rate: 0, tool_fail_rate: 0, request_count: 0 }

export const getConfigCompareStats = (date: string, days: number = 7): ConfigCompareResult => {
  const db = getDb()

  const costCacheQuery = `
    SELECT
      COALESCE(avg(cost_usd), 0) as avg_cost,
      CASE
        WHEN (sum(input_tokens) + sum(cache_read_tokens)) > 0
        THEN CAST(sum(cache_read_tokens) AS REAL) / (sum(input_tokens) + sum(cache_read_tokens))
        ELSE 0
      END as cache_rate,
      count(*) as request_count
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `

  const toolFailQuery = `
    SELECT
      CASE WHEN count(*) > 0
        THEN CAST(sum(CASE WHEN tool_success = 0 THEN 1 ELSE 0 END) AS REAL) / count(*)
        ELSE 0
      END as tool_fail_rate
    FROM agent_logs
    WHERE event_name = 'tool_result'
      AND date(timestamp) >= date(?) AND date(timestamp) < date(?)
  `

  const changeDate = new Date(date)
  const beforeStart = new Date(changeDate)
  beforeStart.setDate(beforeStart.getDate() - days)
  const afterEnd = new Date(changeDate)
  afterEnd.setDate(afterEnd.getDate() + days)

  const beforeStartStr = beforeStart.toISOString().slice(0, 10)
  const changeDateStr = changeDate.toISOString().slice(0, 10)
  const afterEndStr = afterEnd.toISOString().slice(0, 10)

  const beforeCost = db.prepare(costCacheQuery).get(beforeStartStr, changeDateStr) as { avg_cost: number; cache_rate: number; request_count: number } | undefined
  const afterCost = db.prepare(costCacheQuery).get(changeDateStr, afterEndStr) as { avg_cost: number; cache_rate: number; request_count: number } | undefined
  const beforeTool = db.prepare(toolFailQuery).get(beforeStartStr, changeDateStr) as { tool_fail_rate: number } | undefined
  const afterTool = db.prepare(toolFailQuery).get(changeDateStr, afterEndStr) as { tool_fail_rate: number } | undefined

  return {
    before: {
      avg_cost: beforeCost?.avg_cost ?? 0,
      cache_rate: beforeCost?.cache_rate ?? 0,
      tool_fail_rate: beforeTool?.tool_fail_rate ?? 0,
      request_count: beforeCost?.request_count ?? 0,
    },
    after: afterCost ? {
      avg_cost: afterCost.avg_cost ?? 0,
      cache_rate: afterCost.cache_rate ?? 0,
      tool_fail_rate: afterTool?.tool_fail_rate ?? 0,
      request_count: afterCost.request_count ?? 0,
    } : emptyPeriod,
  }
}
