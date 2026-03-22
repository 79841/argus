'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { STORAGE_KEYS } from '@/shared/lib/constants'
import {
  useOnboarding,
  StepIndicator,
  WelcomeStep,
  AgentConnectionStep,
  ProjectConnectionStep,
  VerificationStep,
  CompleteStep,
} from '@/features/onboarding'

export default function OnboardingPage() {
  const router = useRouter()
  const {
    currentStep,
    shouldShow,
    selectedAgents,
    setSelectedAgents,
    goNext,
    goBack,
    complete,
  } = useOnboarding()

  useEffect(() => {
    if (shouldShow === false) {
      router.replace('/')
    }
  }, [shouldShow, router])

  if (shouldShow === null || shouldShow === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <StepIndicator currentStep={currentStep} />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {currentStep === 0 && <WelcomeStep onNext={goNext} />}
        {currentStep === 1 && (
          <AgentConnectionStep
            selectedAgents={selectedAgents}
            onSelectedAgentsChange={setSelectedAgents}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <ProjectConnectionStep
            onNext={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        )}
        {currentStep === 3 && (
          <VerificationStep
            onNext={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        )}
        {currentStep === 4 && <CompleteStep onComplete={complete} />}
      </div>
    </div>
  )
}
