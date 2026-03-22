'use client'

import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useLocale } from '@/shared/lib/i18n'
import { formatRelativeTime } from '@/shared/lib/format'
import { overviewService } from '@/shared/services'

export const PricingSection = () => {
  const { t } = useLocale()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ synced?: number; error?: string } | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    overviewService.getPricingLastSync().then((res) => {
      if (res.lastSyncedAt) setLastSyncedAt(res.lastSyncedAt)
    }).catch(() => {})
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setResult(null)
    try {
      const json = await overviewService.syncPricing()
      setResult(json)
      if (json.lastSyncedAt) setLastSyncedAt(json.lastSyncedAt)
    } catch {
      setResult({ error: 'Failed to connect' })
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.pricing.title')}</CardTitle>
          <CardDescription>
            {t('settings.pricing.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
              {syncing ? t('settings.pricing.syncing') : t('settings.pricing.syncNow')}
            </Button>
            {result && (
              <span className="text-sm text-muted-foreground">
                {result.error
                  ? t('settings.pricing.error', { message: result.error })
                  : t('settings.pricing.syncedModels', { count: String(result.synced) })}
              </span>
            )}
          </div>
          {lastSyncedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>
                {Date.now() - new Date(lastSyncedAt).getTime() < 10_000
                  ? t('settings.pricing.justNow')
                  : t('settings.pricing.lastSynced', { time: formatRelativeTime(lastSyncedAt, t) })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
