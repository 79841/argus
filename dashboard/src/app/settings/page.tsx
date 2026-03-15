'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor, RefreshCw, Database, Cog, Palette, Bot, Globe, FileText, Save, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useTheme } from '@/components/theme-provider'
import { ConfigTimeline } from '@/components/config-timeline'
import { useLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { ConfigChange } from '@/lib/config-tracker'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'
type AgentTheme = 'claude' | 'codex' | 'gemini'

type Category = 'general' | 'agents' | 'pricing' | 'data' | 'config'

const AGENT_THEME_STORAGE_KEY = 'argus-agent-theme'

const AGENT_THEMES: { value: AgentTheme; label: string; color: string }[] = [
  { value: 'claude', label: 'Claude', color: '#f97316' },
  { value: 'codex', label: 'Codex', color: '#10b981' },
  { value: 'gemini', label: 'Gemini', color: '#3b82f6' },
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
                style={agentTheme === at.value ? { borderColor: at.color } : undefined}
              >
                <span
                  className="size-8 rounded-full"
                  style={{ backgroundColor: at.color }}
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
  { id: 'claude', label: 'Claude Code', color: 'bg-orange-500' },
  { id: 'codex', label: 'Codex', color: 'bg-emerald-500' },
  { id: 'gemini', label: 'Gemini CLI', color: 'bg-blue-500' },
]

const AgentsSection = () => {
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
            에이전트별 일일/월별 비용 한도를 설정합니다. Bottom Bar에서 잔여 비율을 확인할 수 있습니다.
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
                          <span className={cn('h-2.5 w-2.5 rounded-full', agent.color)} />
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
          <CardTitle>Agent Setup Guide</CardTitle>
          <CardDescription>
            AI coding agent telemetry setup instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude">
            <TabsList>
              <TabsTrigger value="claude">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Claude Code
              </TabsTrigger>
              <TabsTrigger value="codex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Codex
              </TabsTrigger>
              <TabsTrigger value="gemini">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Gemini CLI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claude">
              <div className="space-y-4 pt-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">1. Environment Variables</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to your shell profile (~/.zshrc or ~/.bashrc):
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000`}</code></pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">2. Project Filtering (optional)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to your project&apos;s <code className="bg-muted px-1 rounded">.claude/settings.json</code>:
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "project.name=my-project"
  }
}`}</code></pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">3. Orchestration Tools Tracking (optional)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to <code className="bg-muted px-1 rounded">~/.claude/settings.json</code>:
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "env": {
    "OTEL_LOG_TOOL_DETAILS": "1"
  }
}`}</code></pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="codex">
              <div className="space-y-4 pt-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">1. OTel Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to <code className="bg-muted px-1 rounded">~/.codex/config.toml</code>:
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`[otel]
exporter = { otlp-http = { endpoint = "http://localhost:3000/v1/logs", protocol = "json" } }`}</code></pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">2. Project Info</h3>
                  <p className="text-sm text-muted-foreground">
                    Codex automatically extracts the project name from the working directory. No additional project configuration is needed.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gemini">
              <div className="space-y-4 pt-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">1. Telemetry Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to <code className="bg-muted px-1 rounded">~/.gemini/settings.json</code>:
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:3000",
    "otlpProtocol": "http"
  }
}`}</code></pre>
                  <p className="text-sm text-muted-foreground mt-2">Or via environment variables:</p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:3000
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http`}</code></pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">2. Project Filtering (optional)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use <code className="bg-muted px-1 rounded">direnv</code> to set per-project attributes:
                  </p>
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`echo 'export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"' > .envrc
direnv allow`}</code></pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

const DataSection = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>Export and manage your monitoring data.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Coming soon &mdash; CSV/JSON export, data cleanup, and retention settings.
        </p>
      </CardContent>
    </Card>
  </div>
)

type ConfigFile = { path: string; exists: boolean }

const simpleMarkdownToHtml = (md: string): string => {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
}

const FileViewer = () => {
  const [files, setFiles] = useState<ConfigFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((json) => setFiles(json.files ?? []))
      .catch(() => setFiles([]))
  }, [])

  const loadFile = useCallback(async (filePath: string) => {
    setFileLoading(true)
    setSaveResult(null)
    try {
      const res = await fetch(`/api/config?path=${encodeURIComponent(filePath)}`)
      const json = await res.json()
      setContent(json.content ?? '')
      setEditContent(json.content ?? '')
      setSelectedFile(filePath)
      setIsEditing(false)
    } catch {
      setContent('')
      setEditContent('')
    } finally {
      setFileLoading(false)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedFile) return
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: editContent }),
      })
      const json = await res.json()
      if (json.success) {
        setContent(editContent)
        setSaveResult('Saved')
        setIsEditing(false)
      } else {
        setSaveResult(`Error: ${json.error}`)
      }
    } catch {
      setSaveResult('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [selectedFile, editContent])

  const isMarkdown = selectedFile?.endsWith('.md') ?? false

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <FileText className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">File Viewer</h3>
        <span className="text-xs text-muted-foreground">View and edit project config files.</span>
      </div>

      <div className="flex gap-2 overflow-x-auto shrink-0 pb-2">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => loadFile(f.path)}
            disabled={!f.exists}
            className={cn(
              'shrink-0 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors',
              selectedFile === f.path
                ? 'border-primary bg-primary/10 text-foreground'
                : f.exists
                  ? 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  : 'border-border text-muted-foreground/40 cursor-not-allowed'
            )}
          >
            {f.path}
          </button>
        ))}
      </div>

      {selectedFile && (
        <div className="flex flex-col flex-1 min-h-0 mt-2">
          <div className="flex items-center justify-between shrink-0 mb-2">
            <span className="text-sm font-medium font-mono">{selectedFile}</span>
            <div className="flex items-center gap-2">
              {saveResult && (
                <span className={cn('text-xs', saveResult === 'Saved' ? 'text-green-600' : 'text-red-500')}>
                  {saveResult}
                </span>
              )}
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setIsEditing(false); setEditContent(content) }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="size-3 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {fileLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full rounded-md border bg-muted/30 p-4 text-xs font-mono leading-5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                spellCheck={false}
              />
            ) : isMarkdown ? (
              <div
                className="rounded-md border bg-muted/30 p-4 text-sm leading-6 h-full overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }}
              />
            ) : (
              <pre className="rounded-md border bg-muted/30 p-4 text-xs font-mono leading-5 h-full overflow-y-auto whitespace-pre-wrap">
                {content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ConfigSection = () => {
  const [data, setData] = useState<ConfigChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/config-history?days=30')
        const json = await res.json()
        setData(json)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0">
        <FileViewer />
      </div>

      <div className="shrink-0 mt-6">
        <div>
          <h2 className="text-lg font-semibold">Config History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Git-tracked config file changes across AI agents. Showing last 30 days.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="mt-4">
            <ConfigTimeline data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

const SECTION_MAP: Record<Category, React.FC> = {
  general: GeneralSection,
  agents: AgentsSection,
  pricing: PricingSection,
  data: DataSection,
  config: ConfigSection,
}

export default function SettingsPage() {
  const [active, setActive] = useState<Category>('general')
  const { t } = useLocale()
  const ActiveSection = SECTION_MAP[active]

  const categories: { key: Category; labelKey: string; icon: React.ElementType }[] = [
    { key: 'general', labelKey: 'settings.general', icon: Palette },
    { key: 'agents', labelKey: 'settings.agents', icon: Bot },
    { key: 'pricing', labelKey: 'settings.pricing', icon: Cog },
    { key: 'data', labelKey: 'settings.data', icon: Database },
    { key: 'config', labelKey: 'settings.config', icon: RefreshCw },
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
      <main className={cn(
        'flex-1 p-6',
        active === 'config' ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-y-auto'
      )}>
        <div className={active === 'config' ? 'flex flex-col flex-1 min-h-0' : undefined}>
          <ActiveSection />
        </div>
      </main>
    </div>
  )
}
