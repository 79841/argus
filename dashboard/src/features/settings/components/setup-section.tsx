'use client'

import { useState } from 'react'
import { Check, Plug, Unplug, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { useAgentConnections } from '../hooks/use-agent-connections'

const AGENT_LABELS: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
}

export const SetupSection = () => {
  const { t } = useLocale()
  const {
    agents,
    endpoint,
    setEndpoint,
    loading,
    connecting,
    hasAnyConnected,
    unconfiguredAgents,
    handleConnect,
    handleDisconnect,
  } = useAgentConnections()
  const [showManual, setShowManual] = useState(false)

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
log_user_prompt = true

[otel.exporter.otlp-http]
endpoint = "http://localhost:9845/v1/logs"
protocol = "json"

[otel.trace_exporter.otlp-http]
endpoint = "http://localhost:9845/v1/logs"
protocol = "json"

[otel.metrics_exporter.otlp-http]
endpoint = "http://localhost:9845/v1/logs"
protocol = "json"`}</code></pre>
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
