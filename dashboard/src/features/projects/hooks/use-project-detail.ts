'use client'

import { useState, useEffect, useCallback } from 'react'
import { projectsService } from '@/shared/services'
import type { ProjectDetailStats, ProjectDailyCost } from '@/shared/lib/queries'

type ProjectData = {
  stats: ProjectDetailStats
  daily: ProjectDailyCost[]
}

type UseProjectDetailReturn = {
  data: ProjectData | null
  loading: boolean
  stats: ProjectDetailStats | undefined
  daily: ProjectDailyCost[]
  refetch: () => void
}

export const useProjectDetail = (projectName: string): UseProjectDetailReturn => {
  const [data, setData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    projectsService.getProjectDetail(projectName)
      .then((res) => {
        setData(res as ProjectData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectName])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    stats: data?.stats,
    daily: data?.daily ?? [],
    refetch: fetchData,
  }
}
