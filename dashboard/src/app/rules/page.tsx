'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FileText,
  Settings,
  Plug,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Save,
  Eye,
  Pencil,
  Loader2,
  Search,
  FolderInput,
  X,
  Folder,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { dataClient } from '@/lib/data-client'
import { MarkdownViewer } from '@/components/markdown-viewer'
import type { Heading } from '@/components/markdown-viewer'
import { TocSidebar } from '@/components/toc-sidebar'
import { ContentSearch } from '@/components/content-search'
import { JsonHighlight, TomlHighlight } from '@/components/syntax-highlight'
import { FilterBar } from '@/components/filter-bar'

type Scope = 'project' | 'user'
type Agent = 'claude' | 'codex' | 'gemini'
type ViewMode = 'preview' | 'edit'

type FileEntry = {
  path: string
  agent: Agent
  scope: Scope
  exists: boolean
  projectRoot: string
  projectName: string
}

type RegistryEntry = {
  project_name: string
  project_path: string
}

type DbProject = {
  project_name: string
  loaded: boolean
  project_path: string
}

type ProjectGroup = {
  projectName: string
  projectRoot: string
  loaded: boolean
  agents: { agent: Agent; files: FileEntry[] }[]
}

const AGENT_LABELS: Record<Agent, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
}

const AGENT_CSS_VARS: Record<Agent, string> = {
  claude: 'var(--agent-claude)',
  codex: 'var(--agent-codex)',
  gemini: 'var(--agent-gemini)',
}

const getFileIcon = (filePath: string) => {
  const name = filePath.split(/[/\\]/).pop() ?? ''
  if (name === '.mcp.json') return <Plug className="size-4 shrink-0 text-muted-foreground" />
  if (name.endsWith('.json') || name.endsWith('.toml'))
    return <Settings className="size-4 shrink-0 text-muted-foreground" />
  if (/[/\\]agents[/\\]/.test(filePath) || /[/\\]skills[/\\]/.test(filePath))
    return <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
  return <FileText className="size-4 shrink-0 text-muted-foreground" />
}

const getFileName = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/)
  const name = parts[parts.length - 1]
  if (/[/\\]agents[/\\]/.test(filePath)) return `agent: ${name.replace('.md', '')}`
  if (/[/\\]skills[/\\]/.test(filePath) && name === 'SKILL.md') {
    const skillName = parts[parts.length - 2]
    return `skill: ${skillName}`
  }
  return filePath.startsWith('~/') ? filePath : name
}

const isMarkdown = (p: string) => p.endsWith('.md')
const isJson = (p: string) => p.endsWith('.json')
const isToml = (p: string) => p.endsWith('.toml')

const fileKey = (file: FileEntry) => `${file.projectRoot}:${file.path}`

const groupByAgent = (list: FileEntry[]) => {
  const map = new Map<Agent, FileEntry[]>()
  for (const f of list) {
    if (!map.has(f.agent)) map.set(f.agent, [])
    map.get(f.agent)!.push(f)
  }
  return Array.from(map.entries()).map(([agent, files]) => ({ agent, files }))
}

const isElectron = () =>
  typeof window !== 'undefined' && window.electronAPI !== undefined

const selectFolder = async (): Promise<string | null> => {
  if (isElectron() && window.electronAPI?.selectFolder) {
    return window.electronAPI.selectFolder('Select Project Folder')
  }
  return null
}

export default function RulesPage() {
  const { t } = useLocale()
  const [dbProjects, setDbProjects] = useState<DbProject[]>([])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [editContent, setEditContent] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [contentLoading, setContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [headings, setHeadings] = useState<Heading[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [loadingProject, setLoadingProject] = useState<string | null>(null)
  const [pathInput, setPathInput] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const loadAll = useCallback(async () => {
    try {
      const [projectsRes, registryRes, configRes] = await Promise.all([
        dataClient.query('projects') as Promise<
          { project_name: string }[] | { projects?: { project_name: string }[] }
        >,
        dataClient.query('projects/registry') as Promise<{ projects?: RegistryEntry[] }>,
        dataClient.query('config') as Promise<{ files?: FileEntry[] }>,
      ])

      const projectsList = Array.isArray(projectsRes)
        ? projectsRes
        : (projectsRes as { projects?: { project_name: string }[] }).projects ?? []
      const dbNames = projectsList.map((p) => p.project_name)
      const registry = new Map(
        (registryRes.projects ?? []).map((r) => [r.project_name, r.project_path])
      )

      setDbProjects(
        dbNames.map((name) => ({
          project_name: name,
          loaded: registry.has(name),
          project_path: registry.get(name) ?? '',
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

  const handleLoad = async (projectName: string, folderPath: string) => {
    if (!folderPath.trim()) return
    setLoadError(null)
    try {
      const res = await dataClient.mutate('projects/registry', {
        name: projectName,
        path: folderPath.trim(),
      }) as { error?: string }
      if (res.error) {
        setLoadError(res.error)
        return
      }
      setLoadingProject(null)
      setPathInput('')
      setLoading(true)
      await loadAll()
    } catch {
      setLoadError('Failed to load project')
    }
  }

  const handleBrowse = async (projectName: string) => {
    const folder = await selectFolder()
    if (folder) {
      setPathInput(folder)
      await handleLoad(projectName, folder)
    }
  }

  const handleUnload = async (projectName: string) => {
    try {
      const res = await fetch(`/api/projects/registry?name=${encodeURIComponent(projectName)}`, {
        method: 'DELETE',
      })
      if (!res.ok) return
      setLoading(true)
      if (selectedFile?.projectName === projectName) {
        setSelectedFile(null)
        setFileContent('')
        setEditContent('')
      }
      await loadAll()
    } catch {
      // ignore
    }
  }

  const loadFile = useCallback(async (file: FileEntry) => {
    setSelectedFile(file)
    setViewMode('preview')
    setContentLoading(true)
    setSaveSuccess(false)
    setHeadings([])
    setSearchOpen(false)
    try {
      const params: Record<string, string> = { path: file.path }
      if (file.projectRoot) params.projectRoot = file.projectRoot
      const data = (await dataClient.query('config', params)) as { content?: string }
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
      await dataClient.mutate('config', {
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

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        if (selectedFile && viewMode === 'preview' && !contentLoading) {
          e.preventDefault()
          setSearchOpen(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, viewMode, contentLoading])

  const projectGroups: ProjectGroup[] = dbProjects.map((dp) => {
    const projectFiles = files.filter(
      (f) => f.scope === 'project' && f.projectName === dp.project_name
    )
    return {
      projectName: dp.project_name,
      projectRoot: dp.project_path,
      loaded: dp.loaded,
      agents: dp.loaded ? groupByAgent(projectFiles) : [],
    }
  })

  const userFiles = files.filter((f) => f.scope === 'user')
  const userAgents = groupByAgent(userFiles)

  const showToc =
    viewMode === 'preview' && isMarkdown(selectedFile?.path ?? '') && headings.length >= 3

  return (
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">Rules</span><span className="text-xs text-muted-foreground">{t('rules.subtitle')}</span></FilterBar>
      <div className="flex flex-1 min-h-0">
      {/* Left: File Tree */}
      <div className="w-[35%] border-r border-[var(--border-subtle)] bg-[var(--bg-sunken)] flex flex-col overflow-auto">

        {loading ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin mr-2" />
            {t('rules.loading')}
          </div>
        ) : (
          <nav className="p-2 space-y-0.5">
            {/* Project groups */}
            {projectGroups.map((project) => {
              const projectKey = `project:${project.projectName}`
              const projectCollapsed = collapsedGroups.has(projectKey)
              const isEditing = loadingProject === project.projectName

              return (
                <div key={project.projectName}>
                  {/* Project header */}
                  <div className="flex items-center group">
                    <button
                      onClick={() => project.loaded && toggleGroup(projectKey)}
                      className={cn(
                        'flex flex-1 items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium transition-colors min-w-0',
                        project.loaded
                          ? 'text-foreground hover:bg-muted'
                          : 'text-muted-foreground/50'
                      )}
                      disabled={!project.loaded}
                    >
                      {project.loaded ? (
                        projectCollapsed ? (
                          <ChevronRight className="size-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="size-3.5 shrink-0" />
                        )
                      ) : (
                        <Folder className="size-3.5 shrink-0 opacity-40" />
                      )}
                      <span className="truncate">{project.projectName}</span>
                    </button>

                    {/* Load / Unload action */}
                    {project.loaded ? (
                      <button
                        onClick={() => handleUnload(project.projectName)}
                        className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        title={t('rules.unload')}
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setLoadingProject(null)
                            setPathInput('')
                            setLoadError(null)
                          } else if (isElectron()) {
                            handleBrowse(project.projectName)
                          } else {
                            setLoadingProject(project.projectName)
                            setPathInput('')
                            setLoadError(null)
                          }
                        }}
                        className={cn(
                          'p-1 mr-1 rounded transition-all shrink-0',
                          isEditing
                            ? 'opacity-100 text-foreground bg-muted'
                            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        title={t('rules.load')}
                      >
                        <FolderInput className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Load project panel */}
                  {isEditing && (
                    <div className="mx-2 mt-1 mb-2 p-3 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t('rules.load.placeholder')}
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={pathInput}
                          onChange={(e) => {
                            setPathInput(e.target.value)
                            setLoadError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLoad(project.projectName, pathInput)
                            if (e.key === 'Escape') {
                              setLoadingProject(null)
                              setPathInput('')
                              setLoadError(null)
                            }
                          }}
                          placeholder="/Users/..."
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                          autoFocus
                        />
                        {isElectron() && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleBrowse(project.projectName)}
                          >
                            <Folder className="size-3" />
                          </Button>
                        )}
                      </div>
                      {loadError && (
                        <p className="text-xs text-destructive">{loadError}</p>
                      )}
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setLoadingProject(null)
                            setPathInput('')
                            setLoadError(null)
                          }}
                        >
                          {t('rules.load.cancel')}
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => handleLoad(project.projectName, pathInput)}
                          disabled={!pathInput.trim()}
                        >
                          {t('rules.load.btn')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Agent/file tree for loaded projects */}
                  {project.loaded &&
                    !projectCollapsed &&
                    project.agents.map(({ agent, files: agentFiles }) => {
                      const agentKey = `${projectKey}-${agent}`
                      const agentCollapsed = collapsedGroups.has(agentKey)
                      return (
                        <div key={agent} className="ml-4">
                          <button
                            onClick={() => toggleGroup(agentKey)}
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium hover:bg-muted transition-colors"
                            style={{ color: AGENT_CSS_VARS[agent] }}
                          >
                            {agentCollapsed ? (
                              <ChevronRight className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                            {AGENT_LABELS[agent]}
                          </button>

                          {!agentCollapsed &&
                            agentFiles.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => loadFile(file)}
                                className={cn(
                                  'flex w-full items-center gap-2 px-2 py-1.5 ml-4 rounded text-sm transition-colors text-left',
                                  selectedFile && fileKey(selectedFile) === fileKey(file)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                              >
                                {getFileIcon(file.path)}
                                <span className="truncate">{getFileName(file.path)}</span>
                              </button>
                            ))}
                        </div>
                      )
                    })}
                </div>
              )
            })}

            {/* User scope */}
            {userAgents.length > 0 && (
              <div>
                <button
                  onClick={() => toggleGroup('user')}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {collapsedGroups.has('user') ? (
                    <ChevronRight className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  {t('rules.scope.user')}
                </button>

                {!collapsedGroups.has('user') &&
                  userAgents.map(({ agent, files: agentFiles }) => {
                    const agentKey = `user-${agent}`
                    const agentCollapsed = collapsedGroups.has(agentKey)
                    return (
                      <div key={agent} className="ml-4">
                        <button
                          onClick={() => toggleGroup(agentKey)}
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium hover:bg-muted transition-colors"
                          style={{ color: AGENT_CSS_VARS[agent] }}
                        >
                          {agentCollapsed ? (
                            <ChevronRight className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          {AGENT_LABELS[agent]}
                        </button>

                        {!agentCollapsed &&
                          agentFiles.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => loadFile(file)}
                              className={cn(
                                'flex w-full items-center gap-2 px-2 py-1.5 ml-4 rounded text-sm transition-colors text-left',
                                selectedFile && fileKey(selectedFile) === fileKey(file)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              )}
                            >
                              {getFileIcon(file.path)}
                              <span className="truncate">{getFileName(file.path)}</span>
                            </button>
                          ))}
                      </div>
                    )
                  })}
              </div>
            )}

            {projectGroups.length === 0 && userAgents.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-4">{t('rules.empty')}</p>
            )}
          </nav>
        )}
      </div>

      {/* Right: File Viewer/Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground px-8">
            <FileText className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">{t('rules.file.placeholder')}</p>
            <p className="text-xs mt-1">{t('rules.file.placeholder.desc')}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {selectedFile.projectName
                    ? `${selectedFile.projectName}/${selectedFile.path}`
                    : selectedFile.path}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {selectedFile.scope === 'project'
                    ? selectedFile.projectName || 'Project'
                    : 'User'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {viewMode === 'preview' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSearchOpen((v) => !v)}
                  >
                    <Search className="size-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={viewMode === 'preview' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="size-3 mr-1" />
                  {t('rules.btn.preview')}
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'edit' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode('edit')}
                >
                  <Pencil className="size-3 mr-1" />
                  {t('rules.btn.edit')}
                </Button>
                {viewMode === 'edit' && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="size-3 animate-spin mr-1" />
                    ) : (
                      <Save className="size-3 mr-1" />
                    )}
                    {t('rules.btn.save')}
                  </Button>
                )}
                {saveSuccess && (
                  <span className="text-xs text-emerald-500 font-medium">
                    {t('rules.btn.saved')}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              <div ref={contentRef} className="flex-1 overflow-auto p-4 relative">
                <ContentSearch
                  containerRef={contentRef}
                  open={searchOpen}
                  onOpenChange={setSearchOpen}
                />
                {contentLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin mr-2" />
                    {t('rules.file.loading')}
                  </div>
                ) : viewMode === 'edit' ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full min-h-[400px] font-mono text-xs bg-transparent border rounded p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    spellCheck={false}
                  />
                ) : isMarkdown(selectedFile.path) ? (
                  <MarkdownViewer
                    content={fileContent}
                    className="space-y-0.5"
                    onHeadingsChange={setHeadings}
                  />
                ) : isJson(selectedFile.path) ? (
                  <JsonHighlight content={fileContent} />
                ) : isToml(selectedFile.path) ? (
                  <TomlHighlight content={fileContent} />
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {fileContent}
                  </pre>
                )}
              </div>

              {showToc && (
                <div className="w-48 shrink-0 overflow-y-auto">
                  <TocSidebar headings={headings} containerRef={contentRef} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
