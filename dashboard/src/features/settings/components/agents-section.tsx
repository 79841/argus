'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { useLocale } from '@/shared/lib/i18n'

export const AgentsSection = () => {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.agents.collection.title')}</CardTitle>
          <CardDescription>
            {t('settings.agents.collection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('settings.agents.collection.comingSoon')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
