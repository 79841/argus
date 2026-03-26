'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { type ReactNode } from 'react'
import { FilterBar } from '@/shared/components/filter-bar'
import { ProjectSubNav } from '@/features/projects/components/project-sub-nav'
import { useLocale } from '@/shared/lib/i18n'

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const projectName = decodeURIComponent(params.name as string)
  const { t } = useLocale()

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          {t('projects.title')}
        </Link>
        <span className="text-sm font-semibold">{projectName}</span>
      </FilterBar>
      <ProjectSubNav projectName={projectName} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
