'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, Globe, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select'
import { useTheme } from '@/shared/components/theme-provider'
import { useLocale } from '@/shared/lib/i18n'
import type { Locale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { STORAGE_KEYS, POLLING } from '@/shared/lib/constants'
import type { Theme, AgentTheme } from '@/features/settings/types/settings'

const AGENT_THEMES: { value: AgentTheme; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'codex', label: 'Codex' },
  { value: 'gemini', label: 'Gemini' },
]

const REFRESH_OPTIONS = POLLING.REFRESH_OPTIONS.map((opt) => ({
  value: String(opt.value),
  label: opt.label,
}))

export const GeneralSection = () => {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()
  const [refreshInterval, setRefreshInterval] = useState('0')
  const [agentTheme, setAgentTheme] = useState<AgentTheme>('claude')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL)
      if (stored) setRefreshInterval(stored)
      const storedAgent = localStorage.getItem(STORAGE_KEYS.AGENT_THEME)
      if (storedAgent && storedAgent !== 'default') {
        setAgentTheme(storedAgent as AgentTheme)
      } else if (storedAgent === 'default') {
        setAgentTheme('claude')
        localStorage.setItem(STORAGE_KEYS.AGENT_THEME, 'claude')
        document.documentElement.setAttribute('data-agent-theme', 'claude')
      }
    } catch {
      // ignore
    }
  }, [])

  const handleRefreshChange = (value: string | null) => {
    if (value === null) return
    setRefreshInterval(value)
    try {
      localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, value)
    } catch {
      // ignore
    }
  }

  const handleAgentThemeChange = (value: AgentTheme) => {
    setAgentTheme(value)
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_THEME, value)
      document.documentElement.setAttribute('data-agent-theme', value)
    } catch {
      // ignore
    }
  }

  const themeOptions: { value: Theme; labelKey: string; icon: React.ElementType }[] = [
    { value: 'light', labelKey: 'settings.theme.light', icon: Sun },
    { value: 'dark', labelKey: 'settings.theme.dark', icon: Moon },
    { value: 'system', labelKey: 'settings.theme.system', icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.theme')}</CardTitle>
          <CardDescription>{t('settings.theme.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border border-white/[0.08] bg-white/[0.04]',
                  theme === opt.value
                    ? 'ring-2 ring-primary/40 bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <opt.icon className="size-4" />
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.agentTheme')}</CardTitle>
          <CardDescription>{t('settings.agentTheme.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {AGENT_THEMES.map((at) => (
              <button
                key={at.value}
                onClick={() => handleAgentThemeChange(at.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 text-sm font-medium transition-colors',
                  agentTheme === at.value
                    ? 'ring-2 ring-primary/40 bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                style={agentTheme === at.value ? { '--tw-ring-color': `var(--agent-${at.value})` } as CSSProperties : undefined}
              >
                <span
                  className="size-8 rounded-full"
                  style={{ backgroundColor: `var(--agent-${at.value})` }}
                />
                {at.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {([
              { value: 'ko' as Locale, label: '한국어' },
              { value: 'en' as Locale, label: 'English' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLocale(opt.value)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border border-white/[0.08] bg-white/[0.04]',
                  locale === opt.value
                    ? 'ring-2 ring-primary/40 bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Globe className="size-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.autoRefresh')}</CardTitle>
          <CardDescription>{t('settings.autoRefresh.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={refreshInterval} onValueChange={handleRefreshChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.onboarding.restart')}</CardTitle>
          <CardDescription>{t('settings.onboarding.restart.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
              router.push('/onboarding')
            }}
          >
            <RotateCcw className="mr-2 size-4" />
            {t('settings.onboarding.restart')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
