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
import { useLocale } from '@/lib/i18n'

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

const AGENT_CSS_VARS: Record<Agent, string> = {
  claude: 'var(--agent-claude)',
  codex: 'var(--agent-codex)',
  gemini: 'var(--agent-gemini)',
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

type InlineToken = {
  type: 'code' | 'bold' | 'italic' | 'link'
  pre: string
  inner: string
  full: string
  href?: string
}

const applyInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode => {
  const parts: React.ReactNode[] = []
  let remaining = text
  let idx = 0

  while (remaining.length > 0) {
    // 인라인 코드
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    // 굵은 글씨
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*/)
    // 이탤릭
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*/)
    // 링크
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/)

    const candidates: InlineToken[] = [
      codeMatch ? { type: 'code', pre: codeMatch[1], inner: codeMatch[2], full: codeMatch[0] } : null,
      boldMatch ? { type: 'bold', pre: boldMatch[1], inner: boldMatch[2], full: boldMatch[0] } : null,
      italicMatch ? { type: 'italic', pre: italicMatch[1], inner: italicMatch[2], full: italicMatch[0] } : null,
      linkMatch ? { type: 'link', pre: linkMatch[1], inner: linkMatch[2], full: linkMatch[0], href: linkMatch[3] } : null,
    ].filter((c): c is InlineToken => c !== null)

    if (candidates.length === 0) {
      parts.push(<span key={`${keyPrefix}-${idx++}`}>{remaining}</span>)
      break
    }

    // 가장 앞에서 매칭되는 패턴 선택
    const best = candidates.reduce((a: InlineToken, b: InlineToken) => a.pre.length <= b.pre.length ? a : b)

    if (best.pre.length > 0) {
      parts.push(<span key={`${keyPrefix}-${idx++}`}>{best.pre}</span>)
    }

    if (best.type === 'code') {
      parts.push(
        <code key={`${keyPrefix}-${idx++}`} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {best.inner}
        </code>
      )
    } else if (best.type === 'bold') {
      parts.push(
        <strong key={`${keyPrefix}-${idx++}`} className="font-semibold">
          {best.inner}
        </strong>
      )
    } else if (best.type === 'italic') {
      parts.push(
        <em key={`${keyPrefix}-${idx++}`} className="italic">
          {best.inner}
        </em>
      )
    } else if (best.type === 'link') {
      parts.push(
        <a
          key={`${keyPrefix}-${idx++}`}
          href={best.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {best.inner}
        </a>
      )
    }

    remaining = remaining.slice(best.full.length)
  }

  return <>{parts}</>
}

const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let ek = 0

  while (i < lines.length) {
    const line = lines[i]

    // 코드 블록 시작
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <div key={ek++} className="my-2">
          {lang && (
            <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-t border border-b-0 font-mono">
              {lang}
            </div>
          )}
          <pre className={`bg-muted text-xs font-mono p-3 whitespace-pre-wrap break-words leading-relaxed border ${lang ? 'rounded-b' : 'rounded'}`}>
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      i++
      continue
    }

    // 수평선
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
      elements.push(<hr key={ek++} className="border-t my-3" />)
      i++
      continue
    }

    // 테이블
    if (line.includes('|') && lines[i + 1]?.match(/^\|?[\s-|]+\|?$/)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      const [headerLine, , ...bodyLines] = tableLines
      const parseRow = (row: string) =>
        row
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)

      elements.push(
        <div key={ek++} className="my-2 overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                {parseRow(headerLine).map((cell, ci) => (
                  <th key={ci} className="border px-3 py-1.5 text-left font-semibold bg-muted">
                    {applyInlineMarkdown(cell, `th-${i}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyLines.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/50">
                  {parseRow(row).map((cell, ci) => (
                    <td key={ci} className="border px-3 py-1.5">
                      {applyInlineMarkdown(cell, `td-${i}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={ek++} className="text-2xl font-bold mt-4 mb-2">
          {applyInlineMarkdown(line.slice(2), `h1-${i}`)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={ek++} className="text-xl font-semibold mt-3 mb-1">
          {applyInlineMarkdown(line.slice(3), `h2-${i}`)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={ek++} className="text-base font-semibold mt-2 mb-1">
          {applyInlineMarkdown(line.slice(4), `h3-${i}`)}
        </h3>
      )
    } else if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={ek++} className="text-sm font-semibold mt-2 mb-1">
          {applyInlineMarkdown(line.slice(5), `h4-${i}`)}
        </h4>
      )
    } else if (line.match(/^(\s*)(- |\* |\d+\. )/)) {
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1].length : 0
      const text = line.replace(/^\s*(- |\* |\d+\. )/, '')
      const isOrdered = /^\s*\d+\. /.test(line)
      elements.push(
        <div key={ek++} className="flex gap-1.5 text-sm leading-relaxed" style={{ paddingLeft: `${indent * 0.5 + 1}rem` }}>
          <span className="shrink-0 text-muted-foreground mt-0.5">{isOrdered ? line.match(/\d+/)?.[0] + '.' : '•'}</span>
          <span>{applyInlineMarkdown(text, `li-${i}`)}</span>
        </div>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={ek++}
          className="border-l-2 border-muted-foreground pl-3 text-sm text-muted-foreground italic my-1"
        >
          {applyInlineMarkdown(line.slice(2), `bq-${i}`)}
        </blockquote>
      )
    } else if (line === '') {
      elements.push(<div key={ek++} className="h-2" />)
    } else {
      elements.push(
        <p key={ek++} className="text-sm leading-relaxed">
          {applyInlineMarkdown(line, `p-${i}`)}
        </p>
      )
    }

    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

const highlightJson = (json: string): React.ReactNode[] => {
  const tokens = json.split(/(\"(?:[^"\\]|\\.)*\"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:])/g)
  return tokens.map((token, i) => {
    if (!token) return null
    // 키 (문자열 다음에 콜론)
    if (/^".*":$/.test(token)) {
      const key = token.slice(0, -1)
      return (
        <span key={i}>
          <span className="text-blue-600 dark:text-blue-400">{key}</span>
          <span className="text-muted-foreground">:</span>
        </span>
      )
    }
    // 문자열 값
    if (/^".*"$/.test(token)) {
      return <span key={i} className="text-green-600 dark:text-green-400">{token}</span>
    }
    // 숫자
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
      return <span key={i} className="text-orange-600 dark:text-orange-400">{token}</span>
    }
    // boolean / null
    if (token === 'true' || token === 'false' || token === 'null') {
      return <span key={i} className="text-purple-600 dark:text-purple-400">{token}</span>
    }
    // 구분자
    if (/^[{}[\],]$/.test(token)) {
      return <span key={i} className="text-muted-foreground">{token}</span>
    }
    return <span key={i}>{token}</span>
  })
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
      {highlightJson(formatted)}
    </pre>
  )
}

const highlightToml = (content: string): React.ReactNode[] => {
  return content.split('\n').map((line, i) => {
    // 주석
    if (/^\s*#/.test(line)) {
      return (
        <span key={i} className="text-muted-foreground italic">
          {line}{'\n'}
        </span>
      )
    }
    // 섹션 헤더 [[...]] 또는 [...]
    if (/^\s*\[/.test(line)) {
      return (
        <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">
          {line}{'\n'}
        </span>
      )
    }
    // 키-값 쌍
    const kvMatch = line.match(/^(\s*)([^=\s][^=]*?)\s*(=)\s*(.*)$/)
    if (kvMatch) {
      const [, indent, key, eq, val] = kvMatch
      let valueNode: React.ReactNode

      // 인라인 주석 분리
      const commentIdx = val.search(/#(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      const valueStr = commentIdx >= 0 ? val.slice(0, commentIdx).trimEnd() : val
      const commentStr = commentIdx >= 0 ? val.slice(commentIdx) : ''

      if (/^".*"$/.test(valueStr) || /^'.*'$/.test(valueStr)) {
        valueNode = <span className="text-green-600 dark:text-green-400">{valueStr}</span>
      } else if (/^(true|false)$/.test(valueStr) || /^-?\d/.test(valueStr)) {
        valueNode = <span className="text-orange-600 dark:text-orange-400">{valueStr}</span>
      } else {
        valueNode = <span>{valueStr}</span>
      }

      return (
        <span key={i}>
          {indent}
          <span className="text-foreground">{key}</span>
          <span className="text-muted-foreground">{eq}</span>
          {valueNode}
          {commentStr && <span className="text-muted-foreground italic"> {commentStr}</span>}
          {'\n'}
        </span>
      )
    }

    return <span key={i}>{line}{'\n'}</span>
  })
}

const TomlHighlight = ({ content }: { content: string }) => {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
      {highlightToml(content)}
    </pre>
  )
}

export default function RulesPage() {
  const { t } = useLocale()
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
          <p className="text-xs text-muted-foreground mt-0.5">{t('rules.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin mr-2" />
            {t('rules.loading')}
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {grouped.map((group) => {
              const scopeKey = group.scope
              const scopeCollapsed = collapsedGroups.has(scopeKey)
              const scopeLabel =
                group.scope === 'project'
                  ? `Project: ${getProjectName()}`
                  : t('rules.scope.user')

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
                            className="flex w-full items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:bg-muted transition-colors"
                            style={{ color: AGENT_CSS_VARS[agent] }}
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
                {t('rules.empty')}
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
            <p className="text-sm font-medium">{t('rules.file.placeholder')}</p>
            <p className="text-xs mt-1">{t('rules.file.placeholder.desc')}</p>
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
                  <span className="text-xs text-emerald-500 font-medium">{t('rules.btn.saved')}</span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
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
                <MarkdownRenderer content={fileContent} />
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
