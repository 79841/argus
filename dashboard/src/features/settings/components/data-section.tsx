'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { useLocale } from '@/shared/lib/i18n'

export const DataSection = () => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.export.title')}</CardTitle>
          <CardDescription>{t('settings.data.export.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('settings.data.export.comingSoon')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.cleanup.title')}</CardTitle>
          <CardDescription>{t('settings.data.cleanup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('settings.data.cleanup.comingSoon')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.dbstats.title')}</CardTitle>
          <CardDescription>{t('settings.data.dbstats.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('settings.data.dbstats.comingSoon')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
