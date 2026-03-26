'use client'

import { useState, useEffect, useCallback } from 'react'
import { dataClient } from '@/shared/lib/data-client'
import type { DailyStats } from '@/shared/lib/queries'

type UseProjectHeatmapReturn = {
  data: DailyStats[]
  loading: boolean
}

export const useProjectHeatmap = (projectName: string): UseProjectHeatmapReturn => {
  const [data, setData] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    dataClient
      .query('daily', { project: projectName, days: 112 })
      .then((res) => {
        setData((res as DailyStats[]) ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectName])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading }
}
