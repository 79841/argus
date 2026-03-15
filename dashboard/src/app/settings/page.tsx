'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor, RefreshCw, Database, Cog, Palette, Bot, Globe, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useTheme } from '@/components/theme-provider'
import { useLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'
type AgentTheme = 'claude' | 'codex' | 'gemini'

type Category = 'general' | 'agents' | 'pricing' | 'setup' | 'data'

const AGENT_THEME_STORAGE_KEY = 'argus-agent-theme'

const AGENT_THEMES: { value: AgentTheme; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'codex', label: 'Codex' },
  { value: 'gemini', label: 'Gemini' },
]

const REFRESH_OPTIONS = [
  { value: '30000', label: '30s' },
  { value: '60000', label: '1m' },
  { value: '300000', label: '5m' },
  { value: '0', label: 'Off' },
]

const REFRESH_STORAGE_KEY = 'argus-refresh-interval'

const GeneralSection = () => {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()
  const [refreshInterval, setRefreshInterval] = useState('0')
  const [agentTheme, setAgentTheme] = useState<AgentTheme>('claude')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REFRESH_STORAGE_KEY)
      if (stored) setRefreshInterval(stored)
      const storedAgent = localStorage.getItem(AGENT_THEME_STORAGE_KEY)
      if (storedAgent && storedAgent !== 'default') {
        setAgentTheme(storedAgent as AgentTheme)
      } else if (storedAgent === 'default') {
        setAgentTheme('claude')
        localStorage.setItem(AGENT_THEME_STORAGE_KEY, 'claude')
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
      localStorage.setItem(REFRESH_STORAGE_KEY, value)
    } catch {
      // ignore
    }
  }

  const handleAgentThemeChange = (value: AgentTheme) => {
    setAgentTheme(value)
    try {
      localStorage.setItem(AGENT_THEME_STORAGE_KEY, value)
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
                  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  theme === opt.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
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
                  'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                  agentTheme === at.value
                    ? 'border-2 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                style={agentTheme === at.value ? { borderColor: `var(--agent-${at.value})` } : undefined}
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
                  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  locale === opt.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
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
    </div>
  )
}

type AgentLimitState = {
  agent_type: string
  daily_cost_limit: string
  monthly_cost_limit: string
}

const LIMIT_AGENT_TYPES = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini', label: 'Gemini CLI' },
]

const AgentsSection = () => {
  const { t } = useLocale()
  const [limits, setLimits] = useState<AgentLimitState[]>(
    LIMIT_AGENT_TYPES.map((a) => ({ agent_type: a.id, daily_cost_limit: '0', monthly_cost_limit: '0' }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/limits')
      .then((r) => r.json())
      .then((data) => {
        const existing = (data.limits ?? []) as { agent_type: string; daily_cost_limit: number; monthly_cost_limit: number }[]
        setLimits((prev) =>
          prev.map((l) => {
            const found = existing.find((e) => e.agent_type === l.agent_type)
            if (found) {
              return {
                ...l,
                daily_cost_limit: String(found.daily_cost_limit),
                monthly_cost_limit: String(found.monthly_cost_limit),
              }
            }
            return l
          })
        )
      })
      .catch(() => {})
  }, [])

  const handleChange = (agentType: string, field: 'daily_cost_limit' | 'monthly_cost_limit', value: string) => {
    setLimits((prev) =>
      prev.map((l) => (l.agent_type === agentType ? { ...l, [field]: value } : l))
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limits: limits.map((l) => ({
            agent_type: l.agent_type,
            daily_cost_limit: parseFloat(l.daily_cost_limit) || 0,
            monthly_cost_limit: parseFloat(l.monthly_cost_limit) || 0,
          })),
        }),
      })
      setSaved(true)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cost Limits
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Coming soon</Badge>
          </CardTitle>
          <CardDescription>
            {t('settings.agents.costLimits.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium w-[30%]">Agent</th>
                  <th className="pb-2 pr-4 font-medium w-[35%]">Daily Limit ($)</th>
                  <th className="pb-2 font-medium w-[35%]">Monthly Limit ($)</th>
                </tr>
              </thead>
              <tbody>
                {LIMIT_AGENT_TYPES.map((agent) => {
                  const limit = limits.find((l) => l.agent_type === agent.id)
                  return (
                    <tr key={agent.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: `var(--agent-${agent.id})` }}
                          />
                          {agent.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled
                          value={limit?.daily_cost_limit ?? '0'}
                          onChange={(e) => handleChange(agent.id, 'daily_cost_limit', e.target.value)}
                          className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled
                          value={limit?.monthly_cost_limit ?? '0'}
                          onChange={(e) => handleChange(agent.id, 'monthly_cost_limit', e.target.value)}
                          className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled variant="outline" size="sm">
              <Save className="size-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection Status</CardTitle>
          <CardDescription>
            {t('settings.agents.collection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; 수집 상태 모니터링.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const PricingSection = () => {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ synced?: number; error?: string } | null>(null)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/pricing-sync', { method: 'POST' })
      const json = await res.json()
      setResult(json)
    } catch {
      setResult({ error: 'Failed to connect' })
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LiteLLM Pricing Sync</CardTitle>
          <CardDescription>
            Sync token pricing data from LiteLLM&apos;s pricing database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            {result && (
              <span className="text-sm text-muted-foreground">
                {result.error
                  ? `Error: ${result.error}`
                  : `Synced ${result.synced} models`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const SetupSection = () => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--agent-claude)' }} />
            Claude Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.claude.step1')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.claude.step1.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000`}</code></pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.claude.step2')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.claude.step2.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "project.name=my-project"
  }
}`}</code></pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.claude.step3')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.claude.step3.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "env": {
    "OTEL_LOG_TOOL_DETAILS": "1"
  }
}`}</code></pre>
            <p className="text-sm text-muted-foreground mt-2">
              {t('settings.setup.claude.step3.note')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.claude.step4')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.setup.claude.step4.desc')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--agent-codex)' }} />
            Codex
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.codex.step1')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.codex.step1.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`[otel]
exporter = { otlp-http = { endpoint = "http://localhost:3000/v1/logs", protocol = "json" } }`}</code></pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.codex.step2')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.setup.codex.step2.desc')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.codex.step3')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.setup.codex.step3.desc')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--agent-gemini)' }} />
            Gemini CLI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.gemini.step1')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.gemini.step1.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:3000",
    "otlpProtocol": "http"
  }
}`}</code></pre>
            <p className="text-sm text-muted-foreground mt-2">{t('settings.setup.gemini.step1.note')}</p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:3000
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http`}</code></pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.gemini.step2')}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.setup.gemini.step2.desc')}
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`echo 'export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"' > .envrc
direnv allow`}</code></pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('settings.setup.gemini.step3')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.setup.gemini.step3.desc')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.setup.dashboard.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`cd dashboard
pnpm install
pnpm dev`}</code></pre>
          <p className="text-sm text-muted-foreground">
            {t('settings.setup.dashboard.desc')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.setup.events.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('settings.setup.events.description')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="bg-muted px-1 rounded">api_request</code> — API request (model, tokens, cost)</li>
              <li><code className="bg-muted px-1 rounded">user_prompt</code> — User prompt</li>
              <li><code className="bg-muted px-1 rounded">tool_result</code> — Tool execution result</li>
              <li><code className="bg-muted px-1 rounded">tool_decision</code> — Tool approval/rejection</li>
              <li><code className="bg-muted px-1 rounded">api_error</code> — API error</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const DataSection = () => {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>{t('settings.data.export.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; CSV/JSON export.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup</CardTitle>
          <CardDescription>{t('settings.data.cleanup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; data cleanup.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DB Statistics</CardTitle>
          <CardDescription>{t('settings.data.dbstats.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon &mdash; DB statistics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const SECTION_MAP: Record<Category, React.FC> = {
  general: GeneralSection,
  agents: AgentsSection,
  pricing: PricingSection,
  setup: SetupSection,
  data: DataSection,
}

export default function SettingsPage() {
  const [active, setActive] = useState<Category>('general')
  const { t } = useLocale()
  const ActiveSection = SECTION_MAP[active]

  const categories: { key: Category; labelKey: string; icon: React.ElementType }[] = [
    { key: 'general', labelKey: 'settings.general', icon: Palette },
    { key: 'agents', labelKey: 'settings.agents', icon: Bot },
    { key: 'pricing', labelKey: 'settings.pricing', icon: Cog },
    { key: 'setup', labelKey: 'settings.setup', icon: Globe },
    { key: 'data', labelKey: 'settings.data', icon: Database },
  ]

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <nav className="w-48 shrink-0 border-r overflow-y-auto py-4 pr-2">
        <h1 className="px-3 mb-4 text-lg font-bold tracking-tight">{t('settings.title')}</h1>
        <ul className="space-y-0.5">
          {categories.map((cat) => (
            <li key={cat.key}>
              <button
                onClick={() => setActive(cat.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active === cat.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <cat.icon className="size-4" />
                {t(cat.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Right content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ActiveSection />
      </main>
    </div>
  )
}
