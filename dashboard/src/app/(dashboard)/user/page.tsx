'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/shared/lib/i18n'
import { FilterBar } from '@/shared/components/filter-bar'
import { AgentFilter } from '@/shared/components/agent-filter'
import type { AgentType } from '@/shared/lib/agents'
import type { Heading } from '@/features/rules/components/markdown-viewer'
import { useConfigFiles, FileTree, FileViewer } from '@/features/rules'
import { useIsMobile } from '@/shared/hooks/use-media-query'
import { UnusedToolsCard } from '@/shared/components/unused-tools-card'
import { useUnusedTools } from '@/shared/hooks/use-unused-tools'

export default function UserPage() {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [headings, setHeadings] = useState<Heading[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const {
    loading,
    selectedFile,
    fileContent,
    contentLoading,
    userAgents,
    clearSelectedFile,
    loadFile,
  } = useConfigFiles({ agentType })
  const unusedTools = useUnusedTools({ globalOnly: true })

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
        if (selectedFile && !contentLoading) {
          e.preventDefault()
          setSearchOpen(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, contentLoading])

  const showTree = isMobile ? !selectedFile : true
  const showViewer = isMobile ? !!selectedFile : true

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <span className="text-sm font-semibold">{t('nav.user')}</span>
        <span className="text-xs text-muted-foreground">{t('user.subtitle')}</span>
        <AgentFilter value={agentType} onChange={setAgentType} />
      </FilterBar>
      {!unusedTools.loading && (
        <div className="px-4 pt-4">
          <UnusedToolsCard
            agents={unusedTools.agents}
            skills={unusedTools.skills}
            mcpServers={unusedTools.mcpServers}
          />
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {showTree && (
          <div className="w-full md:w-[35%] flex flex-col overflow-auto">
            <FileTree
              loading={loading}
              projectGroups={[]}
              userAgents={userAgents}
              selectedFile={selectedFile}
              collapsedGroups={collapsedGroups}
              onToggleGroup={toggleGroup}
              onLoadFile={loadFile}
            />
          </div>
        )}

        {showViewer && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {isMobile && selectedFile && (
              <button
                onClick={clearSelectedFile}
                className="flex items-center px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('rules.backToList')}
              </button>
            )}
            <FileViewer
              selectedFile={selectedFile}
              fileContent={fileContent}
              contentLoading={contentLoading}
              headings={headings}
              searchOpen={searchOpen}
              onSearchOpenChange={setSearchOpen}
              onHeadingsChange={setHeadings}
            />
          </div>
        )}
      </div>
    </div>
  )
}
