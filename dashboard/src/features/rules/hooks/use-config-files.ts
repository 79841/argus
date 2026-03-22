'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { projectsService, configService } from '@/shared/services'
import type { AgentType } from '@/shared/lib/agents'
import type { FileEntry, DbProject, ProjectGroup, Agent } from '@/features/rules/types/rules'

const groupByAgent = (list: FileEntry[]) => {
  const map = new Map<Agent, FileEntry[]>()
  for (const f of list) {
    if (!map.has(f.agent)) map.set(f.agent, [])
    map.get(f.agent)!.push(f)
  }
  return Array.from(map.entries()).map(([agent, files]) => ({ agent, files }))
}

type UseConfigFilesOptions = {
  agentType?: AgentType
}

type UseConfigFilesReturn = {
  dbProjects: DbProject[]
  files: FileEntry[]
  loading: boolean
  selectedFile: FileEntry | null
  fileContent: string
  editContent: string
  viewMode: 'preview' | 'edit'
  contentLoading: boolean
  saving: boolean
  saveSuccess: boolean
  projectGroups: ProjectGroup[]
  userFiles: FileEntry[]
  userAgents: Array<{ agent: Agent; files: FileEntry[] }>
  setEditContent: (content: string) => void
  setViewMode: (mode: 'preview' | 'edit') => void
  loadFile: (file: FileEntry) => Promise<void>
  handleSave: () => Promise<void>
}

export const useConfigFiles = ({ agentType = 'all' }: UseConfigFilesOptions = {}): UseConfigFilesReturn => {
  const [dbProjects, setDbProjects] = useState<DbProject[]>([])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [editContent, setEditContent] = useState('')
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')
  const [contentLoading, setContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [registryRes, configRes] = await Promise.all([
        projectsService.getProjectRegistry(),
        configService.getConfigFiles(),
      ])
      const registry = registryRes.projects ?? []
      setDbProjects(
        registry.map((r) => ({
          project_name: r.project_name,
          loaded: true,
          project_path: r.project_path,
        }))
      )
      setFiles(configRes.files ?? [])
    } catch {
      setDbProjects([])
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (selectedFile && agentType !== 'all' && selectedFile.agent !== agentType) {
      setSelectedFile(null)
      setFileContent('')
      setEditContent('')
    }
  }, [agentType, selectedFile])

  const loadFile = useCallback(async (file: FileEntry) => {
    setSelectedFile(file)
    setViewMode('preview')
    setContentLoading(true)
    setSaveSuccess(false)
    try {
      const params: Record<string, string> = { path: file.path }
      if (file.projectRoot) params.projectRoot = file.projectRoot
      const data = await configService.getConfigContent(params)
      const content = data.content ?? ''
      setFileContent(content)
      setEditContent(content)
    } catch {
      setFileContent('')
      setEditContent('')
    } finally {
      setContentLoading(false)
    }
  }, [])

  const handleSave = async () => {
    if (!selectedFile) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      await configService.saveConfig({
        path: selectedFile.path,
        content: editContent,
        projectRoot: selectedFile.projectRoot || undefined,
      })
      setFileContent(editContent)
      setSaveSuccess(true)
      setViewMode('preview')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const projectGroups = useMemo<ProjectGroup[]>(() => dbProjects.map((dp: DbProject) => {
    const projectFiles = files.filter(
      (f: FileEntry) =>
        f.scope === 'project' &&
        f.projectName === dp.project_name &&
        (agentType === 'all' || f.agent === agentType)
    )
    return {
      projectName: dp.project_name,
      projectRoot: dp.project_path,
      loaded: true,
      agents: groupByAgent(projectFiles),
    }
  }), [dbProjects, files, agentType])

  const userFiles = useMemo(
    () => files.filter((f: FileEntry) => f.scope === 'user' && (agentType === 'all' || f.agent === agentType)),
    [files, agentType]
  )

  const userAgents = useMemo(() => groupByAgent(userFiles), [userFiles])

  return {
    dbProjects,
    files,
    loading,
    selectedFile,
    fileContent,
    editContent,
    viewMode,
    contentLoading,
    saving,
    saveSuccess,
    projectGroups,
    userFiles,
    userAgents,
    setEditContent,
    setViewMode,
    loadFile,
    handleSave,
  }
}
