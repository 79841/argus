'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { AGENTS } from '@/shared/lib/agents'
import type { AgentType } from '@/shared/lib/agents'

type AgentStatus = {
  type: string
  configured: boolean
}

type VerificationStepProps = {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

const useAgentConfigCheck = () => {
  const [configuredAgents, setConfiguredAgents] = useState<AgentStatus[]>([])
  const [configChecked, setConfigChecked] = useState(false)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/setup/status')
      const data = await res.json()
      setConfiguredAgents((data.agents ?? []).filter((a: AgentStatus) => a.configured))
      setConfigChecked(true)
    } catch {
      setConfigChecked(true)
    }
  }, [])

  useEffect(() => { check() }, [check])

  return { configuredAgents, configChecked, hasConfigured: configuredAgents.length > 0, refresh: check }
}

export const VerificationStep = ({ onNext, onBack, onSkip }: VerificationStepProps) => {
  const { t } = useLocale()
  const { configuredAgents, configChecked, hasConfigured } = useAgentConfigCheck()

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold">{t('onboarding.verify.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.verify.desc')}</p>

      <div className="mt-8 w-full max-w-md">
        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          {!configChecked ? (
            <Loader2 className="mt-0.5 size-5 animate-spin text-muted-foreground shrink-0" />
          ) : hasConfigured ? (
            <CheckCircle2 className="mt-0.5 size-5 text-green-500 shrink-0" />
          ) : (
            <Circle className="mt-0.5 size-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className={cn('text-sm font-medium', hasConfigured ? 'text-foreground' : 'text-muted-foreground')}>
              {hasConfigured ? t('onboarding.verify.configOk') : t('onboarding.verify.configNone')}
            </p>
            {hasConfigured && (
              <div className="mt-1 flex flex-wrap gap-2">
                {configuredAgents.map((a) => (
                  <span
                    key={a.type}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `color-mix(in srgb, var(--agent-${a.type}) 20%, transparent)` }}
                  >
                    <Check className="size-3" />
                    {AGENTS[a.type as AgentType]?.name ?? a.type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('onboarding.step.back')}
        </Button>
        <Button onClick={onNext} disabled={!hasConfigured}>
          {t('onboarding.step.next')}
        </Button>
      </div>
      {!hasConfigured && (
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
