'use client'

import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLocale } from '@/shared/lib/i18n'
import { FileText, Settings, Plug, FolderOpen } from 'lucide-react'
import type { Agent, FileEntry, ProjectGroup } from '@/features/rules/types/rules'

export const AGENT_LABELS: Record<Agent, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
}

export const AGENT_CSS_VARS: Record<Agent, string> = {
  claude: 'var(--agent-claude)',
  codex: 'var(--agent-codex)',
  gemini: 'var(--agent-gemini)',
}

export const getFileIcon = (filePath: string) => {
  const name = filePath.split(/[/\\]/).pop() ?? ''
  if (name === '.mcp.json') return <Plug className="size-4 shrink-0 text-muted-foreground" />
  if (name.endsWith('.json') || name.endsWith('.toml'))
    return <Settings className="size-4 shrink-0 text-muted-foreground" />
  if (/[/\\]agents[/\\]/.test(filePath) || /[/\\]skills[/\\]/.test(filePath))
    return <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
  return <FileText className="size-4 shrink-0 text-muted-foreground" />
}

export const getFileName = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/)
  const name = parts[parts.length - 1]
  if (/[/\\]agents[/\\]/.test(filePath)) return `agent: ${name.replace('.md', '')}`
  if (/[/\\]skills[/\\]/.test(filePath) && name === 'SKILL.md') {
    const skillName = parts[parts.length - 2]
    return `skill: ${skillName}`
  }
  return filePath.startsWith('~/') ? filePath : name
}

export const fileKey = (file: FileEntry) => `${file.projectRoot}:${file.path}`

type FileTreeProps = {
  loading: boolean
  projectGroups: ProjectGroup[]
  userAgents: Array<{ agent: Agent; files: FileEntry[] }>
  selectedFile: FileEntry | null
  collapsedGroups: Set<string>
  onToggleGroup: (key: string) => void
  onLoadFile: (file: FileEntry) => void
}

export const FileTree = ({
  loading,
  projectGroups,
  userAgents,
  selectedFile,
  collapsedGroups,
  onToggleGroup,
  onLoadFile,
}: FileTreeProps) => {
  const { t } = useLocale()

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin mr-2" />
        {t('rules.loading')}
      </div>
    )
  }

  return (
    <nav className="p-2 space-y-0.5">
      {projectGroups.map((project) => {
        const projectKey = `project:${project.projectName}`
        const projectCollapsed = collapsedGroups.has(projectKey)

        return (
          <div key={project.projectName}>
            <div className="flex items-center">
              <button
                onClick={() => onToggleGroup(projectKey)}
                className="flex flex-1 items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-0"
              >
                {projectCollapsed ? (
                  <ChevronRight className="size-3.5 shrink-0" />
                ) : (
                  <ChevronDown className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{project.projectName}</span>
              </button>
            </div>

            {!projectCollapsed &&
              project.agents.map(({ agent, files: agentFiles }) => {
                const agentKey = `${projectKey}-${agent}`
                const agentCollapsed = collapsedGroups.has(agentKey)
                return (
                  <div key={agent} className="ml-4">
                    <button
                      onClick={() => onToggleGroup(agentKey)}
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
                          onClick={() => onLoadFile(file)}
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

      {userAgents.length > 0 && (
        <div>
          <button
            onClick={() => onToggleGroup('user')}
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
                    onClick={() => onToggleGroup(agentKey)}
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
                        onClick={() => onLoadFile(file)}
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
        <div className="px-2 py-4 space-y-1">
          <p className="text-sm text-muted-foreground">{t('rules.empty')}</p>
          <p className="text-xs text-muted-foreground">{t('rules.connectGuide')}</p>
        </div>
      )}
    </nav>
  )
}
