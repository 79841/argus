'use client'

import { Check, AlertTriangle, FolderPlus, Folder, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { useProjectRegistry } from '../hooks/use-project-registry'

const TRACKING_STATUS: { agent: string; label: string; supported: boolean; note: string }[] = [
  { agent: 'claude', label: 'Claude', supported: true, note: 'auto' },
  { agent: 'codex', label: 'Codex', supported: true, note: 'auto' },
  { agent: 'gemini', label: 'Gemini', supported: false, note: '미지원' },
]

export const ProjectConnectionSection = () => {
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
    setError,
    showAddForm,
    setShowAddForm,
    isElectron,
    handleAdd,
    handleBrowse,
    handleDisconnect,
    cancelAdd,
  } = useProjectRegistry()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.projectConnection.title')}</CardTitle>
          <CardDescription>{t('settings.projectConnection.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showAddForm ? (
            <Button variant="outline" onClick={() => setShowAddForm(true)}>
              <FolderPlus className="size-4 mr-2" />
              {t('settings.projectConnection.add')}
            </Button>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('settings.projectConnection.path')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pathInput}
                      onChange={(e) => {
                        setPathInput(e.target.value)
                        if (!nameInput || nameInput === pathInput.split(/[/\\]/).pop()) {
                          setNameInput(e.target.value.split(/[/\\]/).pop() || '')
                        }
                        setError(null)
                      }}
                      placeholder="/Users/..."
                      className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {isElectron && (
                      <Button variant="outline" size="sm" onClick={handleBrowse}>
                        <Folder className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('settings.projectConnection.name')}</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); setError(null) }}
                    placeholder="project-name"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelAdd}>
                  {t('settings.projectConnection.cancel')}
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={adding || !pathInput.trim()}>
                  {adding ? 'Connecting...' : t('settings.projectConnection.connect')}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('settings.projectConnection.empty')}
            </div>
          ) : (
            <div className="rounded-md border border-border divide-y divide-border">
              {projects.map((project) => (
                <div key={project.project_name} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{project.project_name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{project.project_path}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(project.project_name)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    {TRACKING_STATUS.map((ts) => (
                      <span key={ts.agent} className="flex items-center gap-1 text-xs">
                        <span
                          className={cn('w-2 h-2 rounded-full', ts.supported ? 'opacity-100' : 'opacity-30')}
                          style={{ backgroundColor: `var(--agent-${ts.agent})` }}
                        />
                        <span className={ts.supported ? 'text-muted-foreground' : 'text-muted-foreground/50'}>
                          {ts.label}
                        </span>
                        {ts.supported ? (
                          <Check className="size-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="size-3 text-yellow-500" />
                        )}
                        <span className={cn('text-[10px]', ts.supported ? 'text-muted-foreground' : 'text-yellow-500')}>
                          {ts.note}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('settings.projectConnection.persist')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
