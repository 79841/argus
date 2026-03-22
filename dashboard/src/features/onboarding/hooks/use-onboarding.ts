'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { STORAGE_KEYS } from '@/shared/lib/constants'

export type OnboardingStep = 0 | 1 | 2 | 3 | 4

export const useOnboarding = () => {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0)
  const [shouldShow, setShouldShow] = useState<boolean | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
    if (completed === 'true') {
      setShouldShow(false)
      return
    }

    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((data) => {
        setShouldShow(!data.hasData)
      })
      .catch(() => {
        setShouldShow(true)
      })
  }, [])

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4) as OnboardingStep)
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0) as OnboardingStep)
  }, [])

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true')
    router.push('/')
  }, [router])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
    setShouldShow(true)
    setCurrentStep(0)
  }, [])

  return {
    currentStep,
    setCurrentStep,
    shouldShow,
    selectedAgents,
    setSelectedAgents,
    goNext,
    goBack,
    complete,
    resetOnboarding,
  }
}
