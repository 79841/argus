'use client'

import { useState, useEffect, useCallback } from 'react'
import { toolsService } from '@/shared/services/tools-service'
import { mergeTools, mergeMcpTools } from '@/features/tools/lib/merge-tools'
import type { MergedToolItem, MergedMcpServer } from '@/features/tools/lib/merge-tools'
import type { IndividualToolRow } from '@/shared/lib/queries'
import type { RegisteredTool } from '@/shared/lib/registered-tools'

type UnusedToolsData = {
  agents: MergedToolItem[]
  skills: MergedToolItem[]
  mcpServers: MergedMcpServer[]
  loading: boolean
}

type UseUnusedToolsOptions = {
  /** 특정 프로젝트의 미활용 도구만 필터 */
  project?: string
  /** global scope만 필터 */
  globalOnly?: boolean
}

export const useUnusedTools = (options: UseUnusedToolsOptions = {}): UnusedToolsData => {
  const { project, globalOnly } = options
  const [data, setData] = useState<Omit<UnusedToolsData, 'loading'>>({
    agents: [],
    skills: [],
    mcpServers: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      toolsService.getRegisteredTools(),
      toolsService.getTools({ detail: true, ...(project ? { project } : {}) }),
    ])
      .then(([registeredData, toolsData]) => {
        let registered = (registeredData as { tools?: RegisteredTool[] }).tools ?? []
        const individual = (toolsData as { individual?: IndividualToolRow[] }).individual ?? []

        if (project) {
          registered = registered.filter((r) => r.projectName === project)
        } else if (globalOnly) {
          registered = registered.filter((r) => r.scope === 'global')
        }

        const agents = mergeTools(registered, individual, 'agent').filter((t) => t.status === 'unused')
        const skills = mergeTools(registered, individual, 'skill').filter((t) => t.status === 'unused')
        const mcpServers = mergeMcpTools(registered, individual).filter((t) => t.status === 'unused')

        setData({ agents, skills, mcpServers })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [project, globalOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...data, loading }
}
