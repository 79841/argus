'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Plug, Unplug } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { dataClient } from '@/shared/lib/data-client'

type HooksStatus = {
  connected: boolean
  hookCount: number
}

type ProjectEntry = {
  project_name: string
  project_path: string
}

export const HooksSection = () => {
  const { t } = useLocale()
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [statuses, setStatuses] = useState<Map<string, HooksStatus>>(new Map())
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dataClient.query('projects/registry') as { projects: ProjectEntry[] }
      setProjects(res.projects ?? [])
      const statusMap = new Map<string, HooksStatus>()
      for (const p of res.projects ?? []) {
        try {
          const s = await dataClient.query('setup/hooks', { project_path: p.project_path }) as HooksStatus
          statusMap.set(p.project_path, s)
        } catch {
          statusMap.set(p.project_path, { connected: false, hookCount: 0 })
        }
      }
      setStatuses(statusMap)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleConnect = async (projectPath: string) => {
    setActing(projectPath)
    try {
      await dataClient.mutate('setup/hooks', { project_path: projectPath })
      await fetchData()
    } finally {
      setActing(null)
    }
  }

  const handleDisconnect = async (projectPath: string) => {
    setActing(projectPath)
    try {
      await dataClient.delete('setup/hooks', { project_path: projectPath })
      await fetchData()
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.hooks.title')}</CardTitle>
          <CardDescription>{t('settings.hooks.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.hooks.noProjects')}</p>
          ) : (
            projects.map((p) => {
              const status = statuses.get(p.project_path)
              const connected = status?.connected ?? false
              return (
                <div key={p.project_path} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{p.project_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.project_path}</div>
                  </div>
                  {connected ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <Check className="size-3.5" />
                        {t('settings.hooks.connected')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(p.project_path)}
                        disabled={acting === p.project_path}
                      >
                        <Unplug className="size-3.5 mr-1" />
                        {t('settings.hooks.disconnect')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(p.project_path)}
                      disabled={acting === p.project_path}
                    >
                      <Plug className="size-3.5 mr-1" />
                      {t('settings.hooks.connect')}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
