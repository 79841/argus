'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'

type Scope = 'project' | 'user'
type Agent = 'claude' | 'codex' | 'gemini'
type ViewMode = 'preview' | 'edit'

type FileEntry = {
  path: string
  agent: Agent
  scope: Scope
  exists: boolean
}

type GroupedFiles = {
  scope: Scope
  agents: {
    agent: Agent
    files: FileEntry[]
  }[]
}

const AGENT_LABELS: Record<Agent, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
}

const AGENT_COLORS: Record<Agent, string> = {
  claude: 'text-orange-500',
  codex: 'text-emerald-500',
  gemini: 'text-blue-500',
}

const getFileIcon = (filePath: string) => {
  const name = filePath.split('/').pop() ?? ''
  if (name === '.mcp.json') return <Plug className="size-3.5 shrink-0 text-muted-foreground" />
  if (name.endsWith('.json') || name.endsWith('.toml'))
    return <Settings className="size-3.5 shrink-0 text-muted-foreground" />
  if (filePath.includes('/agents/') || filePath.includes('/skills/'))
    return <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
  return <FileText className="size-3.5 shrink-0 text-muted-foreground" />
}

const getFileName = (filePath: string): string => {
  const parts = filePath.split('/')
  const name = parts[parts.length - 1]
  if (filePath.includes('/agents/')) return `agent: ${name.replace('.md', '')}`
  if (filePath.includes('/skills/') && name === 'SKILL.md') {
    const skillName = parts[parts.length - 2]
    return `skill: ${skillName}`
  }
  return filePath.startsWith('~/') ? filePath : name
}

const isMarkdown = (filePath: string) => filePath.endsWith('.md')
const isJson = (filePath: string) => filePath.endsWith('.json')
const isToml = (filePath: string) => filePath.endsWith('.toml')

const groupFiles = (files: FileEntry[]): GroupedFiles[] => {
  const projectFiles = files.filter((f) => f.scope === 'project')
  const userFiles = files.filter((f) => f.scope === 'user')

  const groupByAgent = (list: FileEntry[]) => {
    const map = new Map<Agent, FileEntry[]>()
    for (const f of list) {
      if (!map.has(f.agent)) map.set(f.agent, [])
      map.get(f.agent)!.push(f)
    }
    return Array.from(map.entries()).map(([agent, files]) => ({ agent, files }))
  }

  const result: GroupedFiles[] = [
    { scope: 'project' as const, agents: groupByAgent(projectFiles) },
    { scope: 'user' as const, agents: groupByAgent(userFiles) },
  ]
  return result.filter((g) => g.agents.length > 0)
}

const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold mt-3 mb-1">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold mt-2 mb-1">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm">
          {line.slice(2)}
        </li>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-muted-foreground pl-3 text-sm text-muted-foreground italic my-1"
        >
          {line.slice(2)}
        </blockquote>
      )
    } else if (line === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {line}
        </p>
      )
    }
  }

  return <div className="prose-like space-y-0.5">{elements}</div>
}

const JsonHighlight = ({ content }: { content: string }) => {
  let formatted = content
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    // use raw
  }
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
      {formatted}
    </pre>
  )
}

export default function RulesPage() {
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        setFiles(data.files ?? [])
      } catch {
        setFiles([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadFile = useCallback(async (file: FileEntry) => {
    setSelectedFile(file)
    setViewMode('preview')
    setContentLoading(true)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/config?path=${encodeURIComponent(file.path)}`)
      const data = await res.json()
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
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile.path, content: editContent }),
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

  const grouped = groupFiles(files)

  return (
    <div className="flex h-full">
      {/* Left: File Tree 35% */}
      <div className="w-[35%] border-r flex flex-col overflow-auto">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">에이전트 지침 · 스킬 · 설정 파일</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin mr-2" />
            로딩 중...
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {grouped.map((group) => {
              const scopeKey = group.scope
              const scopeCollapsed = collapsedGroups.has(scopeKey)
              const scopeLabel =
                group.scope === 'project'
                  ? `Project: ${getProjectName()}`
                  : 'User: ~ (홈)'

              return (
                <div key={group.scope}>
                  <button
                    onClick={() => toggleGroup(scopeKey)}
                    className="flex w-full items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {scopeCollapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                    {scopeLabel}
                  </button>

                  {!scopeCollapsed &&
                    group.agents.map(({ agent, files: agentFiles }) => {
                      const agentKey = `${group.scope}-${agent}`
                      const agentCollapsed = collapsedGroups.has(agentKey)
                      return (
                        <div key={agent} className="ml-3">
                          <button
                            onClick={() => toggleGroup(agentKey)}
                            className={cn(
                              'flex w-full items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:bg-muted transition-colors',
                              AGENT_COLORS[agent]
                            )}
                          >
                            {agentCollapsed ? (
                              <ChevronRight className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                            {AGENT_LABELS[agent]}
                          </button>

                          {!agentCollapsed &&
                            agentFiles.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => loadFile(file)}
                                className={cn(
                                  'flex w-full items-center gap-2 px-2 py-1.5 ml-3 rounded text-xs transition-colors text-left',
                                  selectedFile?.path === file.path
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

            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">
                에이전트 파일을 찾을 수 없습니다.
              </p>
            )}
          </nav>
        )}
      </div>

      {/* Right: File Viewer/Editor 65% */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground px-8">
            <FileText className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">파일을 선택하세요</p>
            <p className="text-xs mt-1">좌측 트리에서 파일을 클릭하면 내용을 확인할 수 있습니다.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {selectedFile.path}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {selectedFile.scope === 'project' ? 'Project' : 'User'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant={viewMode === 'preview' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="size-3 mr-1" />
                  미리보기
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'edit' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode('edit')}
                >
                  <Pencil className="size-3 mr-1" />
                  편집
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
                    저장
                  </Button>
                )}
                {saveSuccess && (
                  <span className="text-xs text-emerald-500 font-medium">저장됨</span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {contentLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  불러오는 중...
                </div>
              ) : viewMode === 'edit' ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] font-mono text-xs bg-transparent border rounded p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                />
              ) : isMarkdown(selectedFile.path) ? (
                <MarkdownRenderer content={fileContent} />
              ) : isJson(selectedFile.path) || isToml(selectedFile.path) ? (
                <JsonHighlight content={fileContent} />
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function getProjectName(): string {
  if (typeof window === 'undefined') return 'project'
  const parts = window.location.hostname.split('.')
  return parts[0] === 'localhost' ? 'argus' : parts[0]
}
