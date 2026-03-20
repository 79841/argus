'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor, RefreshCw, Database, Cog, Palette, Bot, Globe, Save, Check, Plug, Unplug, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useTheme } from '@/components/theme-provider'
import { useLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { dataClient } from '@/lib/data-client'
import { FilterBar } from '@/components/filter-bar'

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
    dataClient.query('settings/limits')
      .then((data) => {
        const existing = ((data as { limits?: { agent_type: string; daily_cost_limit: number; monthly_cost_limit: number }[] }).limits ?? [])
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
      await dataClient.mutate('settings/limits', {
        limits: limits.map((l) => ({
          agent_type: l.agent_type,
          daily_cost_limit: parseFloat(l.daily_cost_limit) || 0,
          monthly_cost_limit: parseFloat(l.monthly_cost_limit) || 0,
        })),
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
          <Table>
            <TableHeader>
              <TableRow className="text-xs text-muted-foreground">
                <TableHead className="w-[30%]">Agent</TableHead>
                <TableHead className="w-[35%]">Daily Limit ($)</TableHead>
                <TableHead className="w-[35%]">Monthly Limit ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIMIT_AGENT_TYPES.map((agent) => {
                const limit = limits.find((l) => l.agent_type === agent.id)
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: `var(--agent-${agent.id})` }}
                        />
                        {agent.label}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
      const json = await dataClient.mutate('pricing-sync')
      setResult(json as { synced?: number; error?: string })
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

type AgentConnectionStatus = {
  type: string
  configPath: string
  displayPath: string
  installed: boolean
  configured: boolean
  endpoint: string | null
}

const AGENT_LABELS: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
}

const SetupSection = () => {
  const { t } = useLocale()
  const [agents, setAgents] = useState<AgentConnectionStatus[]>([])
  const [endpoint, setEndpoint] = useState('http://localhost:9845')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    dataClient.query('setup/status')
      .then((data) => {
        const d = data as { agents: AgentConnectionStatus[] }
        setAgents(d.agents)
        const connected = d.agents.find((a) => a.configured && a.endpoint)
        if (connected?.endpoint) setEndpoint(connected.endpoint)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const refreshStatus = async () => {
    const data = await dataClient.query('setup/status') as { agents: AgentConnectionStatus[] }
    setAgents(data.agents)
    const connected = data.agents.find((a) => a.configured && a.endpoint)
    if (connected?.endpoint) setEndpoint(connected.endpoint)
  }

  const handleConnect = async (agentTypes: string[]) => {
    const key = agentTypes.length > 1 ? 'all' : agentTypes[0]
    setConnecting(key)
    try {
      await dataClient.mutate('setup/connect', { agents: agentTypes, endpoint })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (type: string) => {
    setConnecting(type)
    try {
      await dataClient.mutate('setup/disconnect', { agents: [type] })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setConnecting(null)
    }
  }

  const hasAnyConnected = agents.some((a) => a.configured)
  const unconfiguredAgents = agents.filter((a) => !a.configured).map((a) => a.type)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Connection</CardTitle>
          <CardDescription>
            Connect your AI coding agents to Argus for telemetry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Endpoint</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              disabled={hasAnyConnected}
              className={cn(
                'w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring',
                hasAnyConnected
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-background'
              )}
              placeholder="http://localhost:9845"
            />
            {hasAnyConnected && (
              <p className="text-xs text-muted-foreground">
                Disconnect all agents to change the endpoint.
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-md border border-border divide-y divide-border">
              {agents.map((agent) => {
                const isConnecting = connecting === agent.type
                const label = AGENT_LABELS[agent.type] ?? agent.type
                return (
                  <div key={agent.type} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          'w-3 h-3 rounded-full shrink-0',
                          agent.configured ? 'opacity-100' : 'opacity-40'
                        )}
                        style={{ backgroundColor: `var(--agent-${agent.type})` }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{agent.displayPath}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {agent.configured ? (
                        <>
                          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <Check className="size-3.5" />
                            Connected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isConnecting}
                            onClick={() => handleDisconnect(agent.type)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Unplug className="size-3.5 mr-1" />
                            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">Not configured</span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isConnecting}
                            onClick={() => handleConnect([agent.type])}
                          >
                            <Plug className="size-3.5 mr-1" />
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {unconfiguredAgents.length > 0 && !loading && (
            <div>
              <Button
                variant="outline"
                disabled={connecting === 'all'}
                onClick={() => handleConnect(unconfiguredAgents)}
              >
                <Plug className="size-4 mr-2" />
                {connecting === 'all' ? 'Connecting...' : 'Connect All'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <button
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showManual ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Manual Setup Guide
        </button>

        {showManual && (
          <div className="mt-4 space-y-6">
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
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845
export OTEL_LOG_USER_PROMPTS=1`}</code></pre>
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
exporter = { otlp-http = { endpoint = "http://localhost:9845/v1/logs", protocol = "json" } }`}</code></pre>
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
    "otlpEndpoint": "http://localhost:9845",
    "otlpProtocol": "http"
  }
}`}</code></pre>
                  <p className="text-sm text-muted-foreground mt-2">{t('settings.setup.gemini.step1.note')}</p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:9845
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
        )}
      </div>
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
    <div className="flex h-full flex-col">
      <FilterBar><span className="text-sm font-semibold">{t('settings.title')}</span></FilterBar>
      <div className="flex flex-1 min-h-0">
      {/* Left sidebar */}
      <nav className="w-48 shrink-0 border-r border-[var(--border-subtle)] overflow-y-auto py-4 px-2">
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
    </div>
  )
}
