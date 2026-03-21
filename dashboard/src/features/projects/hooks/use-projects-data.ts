'use client'

import { useState, useEffect, useCallback } from 'react'
import { projectsService } from '@/shared/services'
import type { ProjectComparisonRow } from '@/lib/queries'

type UseProjectsDataReturn = {
  projects: ProjectComparisonRow[]
  loading: boolean
  totalCost: number
  mostActive: ProjectComparisonRow | null
  refetch: () => void
}

export const useProjectsData = (): UseProjectsDataReturn => {
  const [projects, setProjects] = useState<ProjectComparisonRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    projectsService.getProjects({ view: 'comparison' })
      .then((res) => {
        setProjects(res as ProjectComparisonRow[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalCost = projects.reduce((s, p) => s + p.total_cost, 0)
  const mostActive = projects.reduce<ProjectComparisonRow | null>((best, p) => {
    if (!best) return p
    return p.session_count > best.session_count ? p : best
  }, null)

  return {
    projects,
    loading,
    totalCost,
    mostActive,
    refetch: fetchData,
  }
}
