'use client'

import { Plus, FolderOpen, X, Unplug } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useLocale } from '@/shared/lib/i18n'
import { useProjectRegistry } from '@/features/settings/hooks/use-project-registry'

type ProjectConnectionStepProps = {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export const ProjectConnectionStep = ({
  onNext,
  onBack,
  onSkip,
}: ProjectConnectionStepProps) => {
  const { t } = useLocale()
  const {
    projects,
    loading,
    adding,
    pathInput,
    setPathInput,
    nameInput,
    setNameInput,
    error,
    showAddForm,
    setShowAddForm,
    isElectron,
    handleAdd,
    handleBrowse,
    handleDisconnect,
    cancelAdd,
  } = useProjectRegistry()

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold">{t('onboarding.project.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.project.desc')}</p>

      <div className="mt-6 w-full max-w-lg space-y-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t('onboarding.loading')}</div>
        ) : (
          <>
            {projects.length > 0 && (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Card key={project.project_name}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{project.project_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{project.project_path}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(project.project_name)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Unplug className="size-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showAddForm ? (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('settings.projectConnection.path')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pathInput}
                        onChange={(e) => setPathInput(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="/path/to/project"
                      />
                      {isElectron && (
                        <Button variant="outline" size="sm" onClick={handleBrowse}>
                          <FolderOpen className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('settings.projectConnection.name')}</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="my-project"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelAdd}>
                      <X className="mr-1 size-3.5" />
                      {t('settings.projectConnection.cancel')}
                    </Button>
                    <Button size="sm" disabled={adding || !pathInput.trim()} onClick={handleAdd}>
                      {adding ? t('onboarding.connecting') : t('settings.projectConnection.connect')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 size-4" />
                {t('settings.projectConnection.add')}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('onboarding.step.back')}
        </Button>
        <Button onClick={onNext} disabled={projects.length === 0}>
          {t('onboarding.step.next')}
        </Button>
      </div>
      <button
        onClick={onSkip}
        className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t('onboarding.project.skip')}
      </button>
    </div>
  )
}
