'use client'

import { useRef } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { FileText, Save, Eye, Pencil, Loader2, Search } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { MarkdownViewer } from '@/features/rules/components/markdown-viewer'
import type { Heading } from '@/features/rules/components/markdown-viewer'
import { TocSidebar } from '@/features/rules/components/toc-sidebar'
import { ContentSearch } from '@/features/rules/components/content-search'
import { JsonHighlight, TomlHighlight } from '@/features/rules/components/syntax-highlight'
import type { FileEntry } from '@/features/rules/types/rules'

export const isMarkdown = (p: string) => p.endsWith('.md')
export const isJson = (p: string) => p.endsWith('.json')
export const isToml = (p: string) => p.endsWith('.toml')

type FileViewerProps = {
  selectedFile: FileEntry | null
  fileContent: string
  editContent: string
  viewMode: 'preview' | 'edit'
  contentLoading: boolean
  saving: boolean
  saveSuccess: boolean
  headings: Heading[]
  searchOpen: boolean
  onEditContentChange: (content: string) => void
  onViewModeChange: (mode: 'preview' | 'edit') => void
  onSave: () => void
  onSearchOpenChange: (open: boolean) => void
  onHeadingsChange: (headings: Heading[]) => void
}

export const FileViewer = ({
  selectedFile,
  fileContent,
  editContent,
  viewMode,
  contentLoading,
  saving,
  saveSuccess,
  headings,
  searchOpen,
  onEditContentChange,
  onViewModeChange,
  onSave,
  onSearchOpenChange,
  onHeadingsChange,
}: FileViewerProps) => {
  const { t } = useLocale()
  const contentRef = useRef<HTMLDivElement>(null)

  const showToc =
    viewMode === 'preview' && isMarkdown(selectedFile?.path ?? '') && headings.length >= 3

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground px-8">
        <FileText className="size-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{t('rules.file.placeholder')}</p>
        <p className="text-xs mt-1">{t('rules.file.placeholder.desc')}</p>
      </div>
    )
  }

  return (
    <>
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
              onClick={() => onSearchOpenChange(!searchOpen)}
            >
              <Search className="size-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => onViewModeChange('preview')}
          >
            <Eye className="size-3 mr-1" />
            {t('rules.btn.preview')}
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'edit' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => onViewModeChange('edit')}
          >
            <Pencil className="size-3 mr-1" />
            {t('rules.btn.edit')}
          </Button>
          {viewMode === 'edit' && (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              onClick={onSave}
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

      <div className="flex-1 flex overflow-hidden">
        <div ref={contentRef} className="flex-1 overflow-auto p-4 relative">
          <ContentSearch
            containerRef={contentRef}
            open={searchOpen}
            onOpenChange={onSearchOpenChange}
          />
          {contentLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />
              {t('rules.file.loading')}
            </div>
          ) : viewMode === 'edit' ? (
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full h-full min-h-[400px] font-mono text-xs bg-transparent border rounded p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
          ) : isMarkdown(selectedFile.path) ? (
            <MarkdownViewer
              content={fileContent}
              className="space-y-0.5"
              onHeadingsChange={onHeadingsChange}
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
  )
}
