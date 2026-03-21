'use client'

import { useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { overviewService } from '@/shared/services'

export const PricingSection = () => {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ synced?: number; error?: string } | null>(null)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setResult(null)
    try {
      const json = await overviewService.syncPricing()
      setResult(json)
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
          <CardTitle>LiteLLM Pricing Sync</CardTitle>
          <CardDescription>
            Sync token pricing data from LiteLLM&apos;s pricing database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            {result && (
              <span className="text-sm text-muted-foreground">
                {result.error
                  ? `Error: ${result.error}`
                  : `Synced ${result.synced} models`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
