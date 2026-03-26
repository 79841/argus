'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from '@/shared/lib/i18n'
import { AgentFilter } from '@/shared/components/agent-filter'
import type { AgentType } from '@/shared/lib/agents'
import type { Heading } from '@/features/rules/components/markdown-viewer'
import { useConfigFiles, FileTree, FileViewer } from '@/features/rules'

export default function ProjectRulesPage() {
  const { t } = useLocale()
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)

  const [agentType, setAgentType] = useState<AgentType>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [headings, setHeadings] = useState<Heading[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const {
    loading,
    selectedFile,
    fileContent,
    editContent,
    viewMode,
    contentLoading,
    saving,
    saveSuccess,
    projectGroups,
    setEditContent,
    setViewMode,
    loadFile,
    handleSave,
  } = useConfigFiles({ agentType })

  const filteredProjectGroups = projectGroups.filter(
    (g) => g.projectName === projectName
  )

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-xs text-muted-foreground">{t('rules.subtitle')}</span>
        <AgentFilter value={agentType} onChange={setAgentType} />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[35%] flex flex-col overflow-auto">
          <FileTree
            loading={loading}
            projectGroups={filteredProjectGroups}
            userAgents={[]}
            selectedFile={selectedFile}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onLoadFile={loadFile}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <FileViewer
            selectedFile={selectedFile}
            fileContent={fileContent}
            editContent={editContent}
            viewMode={viewMode}
            contentLoading={contentLoading}
            saving={saving}
            saveSuccess={saveSuccess}
            headings={headings}
            searchOpen={searchOpen}
            onEditContentChange={setEditContent}
            onViewModeChange={setViewMode}
            onSave={handleSave}
            onSearchOpenChange={setSearchOpen}
            onHeadingsChange={setHeadings}
          />
        </div>
      </div>
    </div>
  )
}
