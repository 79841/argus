'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { AgentBadge } from '@/shared/components/ui/agent-badge'
import { shortenModel, parseModels } from '@/shared/lib/format'
import type { SessionSummary } from '@/shared/lib/queries'
import type { AgentType } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'

export type SessionHeaderProps = {
  summary: SessionSummary
  sessionId: string
}

export const SessionHeader = ({ summary, sessionId }: SessionHeaderProps) => {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AgentBadge agent={summary.agent_type as AgentType} />
        <div className="flex flex-wrap gap-1">
          {parseModels(summary.model || '').map((m) => (
            <Badge key={m} variant="outline" className="text-xs">
              {shortenModel(m)}
            </Badge>
          ))}
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? t('sessions.id.copied') : t('sessions.id.copy')}
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {sessionId.slice(0, 8)}…
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
        </button>
        {summary.project_name && (
          <span className="text-xs text-muted-foreground">{summary.project_name}</span>
        )}
      </div>
    </div>
  )
}
