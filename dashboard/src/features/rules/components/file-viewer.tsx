'use client'

import { useRef, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { FileText, Loader2, Search, BookOpen } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { MarkdownViewer } from '@/features/rules/components/markdown-viewer'
import type { Heading } from '@/features/rules/components/markdown-viewer'
import { TocSidebar } from '@/features/rules/components/toc-sidebar'
import { ContentSearch } from '@/features/rules/components/content-search'
import type { FileEntry } from '@/features/rules/types/rules'

export const isMarkdown = (p: string) => p.endsWith('.md')

type FileViewerProps = {
  selectedFile: FileEntry | null
  fileContent: string
  contentLoading: boolean
  headings: Heading[]
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  onHeadingsChange: (headings: Heading[]) => void
}

export const FileViewer = ({
  selectedFile,
  fileContent,
  contentLoading,
  headings,
  searchOpen,
  onSearchOpenChange,
  onHeadingsChange,
}: FileViewerProps) => {
  const { t } = useLocale()
  const contentRef = useRef<HTMLDivElement>(null)
  const [tocOpen, setTocOpen] = useState(false)

  const showToc = isMarkdown(selectedFile?.path ?? '') && headings.length >= 3

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
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onSearchOpenChange(!searchOpen)}
          >
            <Search className="size-3" />
          </Button>
          {showToc && (
            <Button
              size="sm"
              variant={tocOpen ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs lg:hidden"
              onClick={() => setTocOpen((v) => !v)}
              title={t('rules.tableOfContents')}
            >
              <BookOpen className="size-3 mr-1" />
              {t('rules.tocToggle')}
            </Button>
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
          ) : isMarkdown(selectedFile.path) ? (
            <MarkdownViewer
              content={fileContent}
              className="space-y-0.5"
              onHeadingsChange={onHeadingsChange}
            />
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
              {fileContent}
            </pre>
          )}
        </div>

        {showToc && (
          <>
            <div className="hidden lg:block w-48 shrink-0 overflow-y-auto">
              <TocSidebar headings={headings} containerRef={contentRef} />
            </div>
            {tocOpen && (
              <div className="lg:hidden absolute top-0 right-0 z-10 w-56 h-full overflow-y-auto shadow-lg bg-background/95 backdrop-blur-sm p-2">
                <TocSidebar headings={headings} containerRef={contentRef} onHeadingClick={() => setTocOpen(false)} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
