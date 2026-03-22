'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { useVerificationPolling } from '../hooks/use-verification-polling'

type VerificationStepProps = {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export const VerificationStep = ({ onNext, onBack, onSkip }: VerificationStepProps) => {
  const { t } = useLocale()
  const { verified, seeding, triggerSeed } = useVerificationPolling()

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold">{t('onboarding.verify.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.verify.desc')}</p>

      <div className="mt-8 flex flex-col items-center gap-4">
        {verified ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {t('onboarding.verify.received')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('onboarding.verify.waiting')}</p>
          </div>
        )}

        {!verified && (
          <Button
            variant="outline"
            onClick={triggerSeed}
            disabled={seeding}
          >
            {seeding ? t('onboarding.verify.seeding') : t('onboarding.verify.seed')}
          </Button>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('onboarding.step.back')}
        </Button>
        <Button onClick={onNext} disabled={!verified}>
          {t('onboarding.step.next')}
        </Button>
      </div>
      {!verified && (
        <button
          onClick={onSkip}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t('onboarding.verify.skip')}
        </button>
      )}
    </div>
  )
}
