'use client'

import { DollarSign, BarChart3, Layers } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'

type WelcomeStepProps = {
  onNext: () => void
}

const FEATURES = [
  { key: 'feature1', icon: DollarSign, color: 'text-emerald-500' },
  { key: 'feature2', icon: BarChart3, color: 'text-blue-500' },
  { key: 'feature3', icon: Layers, color: 'text-violet-500' },
] as const

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  const { t } = useLocale()

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <svg viewBox="0 0 24 24" className="size-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {t('onboarding.welcome.title')}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t('onboarding.welcome.subtitle')}
      </p>

      <div className="mt-8 grid w-full max-w-lg gap-4">
        {FEATURES.map(({ key, icon: Icon, color }) => (
          <div
            key={key}
            className="flex items-start gap-4 rounded-lg border border-border p-4 text-left"
          >
            <div className={cn('mt-0.5', color)}>
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {t(`onboarding.welcome.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`onboarding.welcome.${key}.desc`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button className="mt-8" size="lg" onClick={onNext}>
        {t('onboarding.welcome.start')}
      </Button>
    </div>
  )
}
