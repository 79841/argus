'use client'

import { Check } from 'lucide-react'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import type { OnboardingStep } from '../hooks/use-onboarding'

type StepIndicatorProps = {
  currentStep: OnboardingStep
}

const STEP_KEYS = [
  'onboarding.welcome.title',
  'onboarding.agent.title',
  'onboarding.project.title',
  'onboarding.verify.title',
  'onboarding.complete.title',
] as const

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const { t } = useLocale()

  return (
    <div className="flex items-center justify-center gap-2">
      {STEP_KEYS.map((key, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep

        return (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-8',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                  (isCompleted || isCurrent) && 'bg-primary text-primary-foreground',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs sm:inline',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {t(key)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
