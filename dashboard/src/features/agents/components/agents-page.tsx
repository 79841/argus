'use client'

import { Loader2 } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { useAgentsLive } from '../hooks/use-agents-live'
import { ProjectRoom } from './project-room'

export const AgentsPage = () => {
  const { t } = useLocale()
  const { projects, activeCount, isLoading } = useAgentsLive()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">{t('agents.title')}</h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {activeCount > 0 && (
            <>
              <span className="inline-block h-[7px] w-[7px] animate-pulse rounded-full bg-emerald-500" />
              <span>{t('agents.activeSessions').replace('{count}', String(activeCount))}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-2">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title={t('agents.empty')}
            description={t('agents.emptyDescription')}
          />
        ) : (
          projects.map((project) => (
            <ProjectRoom key={project.project_name} project={project} />
          ))
        )}
      </div>
    </div>
  )
}
