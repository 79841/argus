'use client'

import { PartyPopper } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'

type CompleteStepProps = {
  onComplete: () => void
}

export const CompleteStep = ({ onComplete }: CompleteStepProps) => {
  const { t } = useLocale()

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
        <PartyPopper className="size-8 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-2xl font-bold">{t('onboarding.complete.title')}</h2>
      <p className="mt-2 text-muted-foreground">{t('onboarding.complete.desc')}</p>

      <Button className="mt-8" size="lg" onClick={onComplete}>
        {t('onboarding.complete.dashboard')}
      </Button>
    </div>
  )
}
