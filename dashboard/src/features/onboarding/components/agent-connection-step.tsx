'use client'

import { useState } from 'react'
import { Check, Copy, Plug } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useLocale } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { useAgentConnections } from '@/features/settings/hooks/use-agent-connections'

type AgentConnectionStepProps = {
  selectedAgents: string[]
  onSelectedAgentsChange: (agents: string[]) => void
  onNext: () => void
  onBack: () => void
}

const AGENTS = [
  { type: 'claude', label: 'Claude Code', color: 'var(--agent-claude)' },
  { type: 'codex', label: 'Codex CLI', color: 'var(--agent-codex)' },
  { type: 'gemini', label: 'Gemini CLI', color: 'var(--agent-gemini)' },
] as const

const SETUP_SNIPPETS: Record<string, { label: string; code: (endpoint: string) => string }> = {
  claude: {
    label: 'Shell Profile (~/.zshrc)',
    code: (ep) => `export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=${ep}
export OTEL_LOG_USER_PROMPTS=1`,
  },
  codex: {
    label: '~/.codex/config.toml',
    code: (ep) => `[otel]
log_user_prompt = true

[otel.exporter.otlp-http]
endpoint = "${ep}/v1/logs"
protocol = "json"

[otel.trace_exporter.otlp-http]
endpoint = "${ep}/v1/logs"
protocol = "json"

[otel.metrics_exporter.otlp-http]
endpoint = "${ep}/v1/logs"
protocol = "json"`,
  },
  gemini: {
    label: '~/.gemini/settings.json',
    code: (ep) => `{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "${ep}",
    "otlpProtocol": "http"
  }
}`,
  },
}

export const AgentConnectionStep = ({
  selectedAgents,
  onSelectedAgentsChange,
  onNext,
  onBack,
}: AgentConnectionStepProps) => {
  const { t } = useLocale()
  const {
    agents: connectionStatus,
    endpoint,
    setEndpoint,
    connecting,
    handleConnect,
  } = useAgentConnections()
  const [copiedAgent, setCopiedAgent] = useState<string | null>(null)

  const toggleAgent = (type: string) => {
    onSelectedAgentsChange(
      selectedAgents.includes(type)
        ? selectedAgents.filter((a) => a !== type)
        : [...selectedAgents, type]
    )
  }

  const copyToClipboard = async (agent: string) => {
    const snippet = SETUP_SNIPPETS[agent]
    if (!snippet) return
    await navigator.clipboard.writeText(snippet.code(endpoint))
    setCopiedAgent(agent)
    setTimeout(() => setCopiedAgent(null), 2000)
  }

  const connectedTypes = connectionStatus.filter((a) => a.configured).map((a) => a.type)

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold">{t('onboarding.agent.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.agent.desc')}</p>

      <div className="mt-6 w-full max-w-lg space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('onboarding.agent.endpoint')}</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="http://localhost:9845"
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t('onboarding.agent.select')}</label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {AGENTS.map((agent) => {
              const isSelected = selectedAgents.includes(agent.type)
              const isConnected = connectedTypes.includes(agent.type)
              return (
                <button
                  key={agent.type}
                  onClick={() => toggleAgent(agent.type)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-2 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  style={isSelected ? { borderColor: agent.color } : undefined}
                >
                  <span
                    className="size-8 rounded-full"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span>{agent.label}</span>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="size-3" /> Connected
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selectedAgents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('onboarding.agent.setupGuide')}</label>
              <Button
                variant="outline"
                size="sm"
                disabled={connecting !== null}
                onClick={() => handleConnect(selectedAgents)}
              >
                <Plug className="mr-1.5 size-3.5" />
                {connecting ? t('onboarding.connecting') : t('onboarding.agent.autoSetup')}
              </Button>
            </div>

            {selectedAgents.map((agentType) => {
              const snippet = SETUP_SNIPPETS[agentType]
              if (!snippet) return null
              return (
                <Card key={agentType}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {snippet.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyToClipboard(agentType)}
                      >
                        {copiedAgent === agentType ? (
                          <><Check className="mr-1 size-3" />{t('onboarding.agent.copied')}</>
                        ) : (
                          <><Copy className="mr-1 size-3" />{t('onboarding.agent.copy')}</>
                        )}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      <code>{snippet.code(endpoint)}</code>
                    </pre>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('onboarding.step.back')}
        </Button>
        <Button onClick={onNext} disabled={selectedAgents.length === 0}>
          {t('onboarding.step.next')}
        </Button>
      </div>
      {selectedAgents.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t('onboarding.agent.noSelect')}</p>
      )}
    </div>
  )
}
