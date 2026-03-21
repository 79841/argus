'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLocale } from '@/lib/i18n'

export const DataSection = () => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>{t('settings.data.export.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; CSV/JSON export.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup</CardTitle>
          <CardDescription>{t('settings.data.cleanup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; data cleanup.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DB Statistics</CardTitle>
          <CardDescription>{t('settings.data.dbstats.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; DB statistics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
