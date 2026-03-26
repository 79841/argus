'use client'

import { useState, useEffect, useCallback } from 'react'
import { toolsService } from '@/shared/services'
import type { ToolSingleStat, ToolDailyRow, ToolSessionRow } from '@/shared/lib/queries'

type UseToolDetailReturn = {
  tool: ToolSingleStat | null
  daily: ToolDailyRow[]
  sessions: ToolSessionRow[]
  loading: boolean
}

export const useToolDetail = (toolName: string, days: number): UseToolDetailReturn => {
  const [tool, setTool] = useState<ToolSingleStat | null>(null)
  const [daily, setDaily] = useState<ToolDailyRow[]>([])
  const [sessions, setSessions] = useState<ToolSessionRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    toolsService
      .getToolDetail(toolName, days)
      .then((res) => {
        setTool((res.tool ?? null) as ToolSingleStat | null)
        setDaily((res.daily ?? []) as ToolDailyRow[])
        setSessions((res.sessions ?? []) as ToolSessionRow[])
      })
      .catch(() => {
        setTool(null)
        setDaily([])
        setSessions([])
      })
      .finally(() => setLoading(false))
  }, [toolName, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { tool, daily, sessions, loading }
}
