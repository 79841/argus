'use client'

import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { AgentDot } from '@/shared/components/ui/agent-dot'
import type { AgentType } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'
import { formatCost, formatTokens, formatDuration, shortenModel, parseModels } from '@/shared/lib/format'
import { formatRelativeTime } from '@/shared/lib/format'

type SessionListItemSession = {
  session_id: string
  agent_type: string
  model: string | null
  project_name: string | null
  cost: number
  duration_ms: number
  input_tokens: number
  output_tokens: number
  last_activity: string | null
  started_at: string
}

type SessionListItemProps = {
  session: SessionListItemSession
  selected: boolean
  cacheRate: number
  onSelect: (sessionId: string) => void
}

export const SessionListItem = ({ session: s, selected, cacheRate, onSelect }: SessionListItemProps) => {
  const { t } = useLocale()

  return (
    <div
      className={`group relative border-b border-[var(--border-subtle)] transition-colors hover:bg-muted/50 ${
        selected ? 'bg-muted ring-1 ring-inset ring-muted-foreground/20' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(s.session_id)}
        className="w-full px-4 py-3 text-left"
      >
        {/* Row 1: agent dot + models + cost */}
        <div className="flex items-center gap-2">
          <AgentDot agent={s.agent_type as AgentType} size="md" />
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {parseModels(s.model ?? '').map((m) => (
              <Badge key={m} variant="secondary" className="text-xs font-medium">
                {shortenModel(m)}
              </Badge>
            ))}
          </div>
          <span className="mr-6 ml-auto shrink-0 text-sm font-semibold tabular-nums">
            {formatCost(s.cost)}
          </span>
        </div>
        {/* Row 2: project + duration */}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[120px]">{s.project_name || 'no project'}</span>
          <span className="text-border">·</span>
          <span>{formatDuration(s.duration_ms)}</span>
        </div>
        {/* Row 3: tokens + cache rate + relative time */}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTokens(s.input_tokens + s.output_tokens)} tok</span>
          {cacheRate > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">{t('sessions.cache')}{cacheRate}%</span>
            </>
          )}
          <span className="ml-auto shrink-0">{formatRelativeTime(s.last_activity || s.started_at, t)}</span>
        </div>
      </button>
      {/* External link to detail page */}
      <Link
        href={`/sessions/${encodeURIComponent(s.session_id)}`}
        title={t('sessions.detail.openDetail')}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </Link>
    </div>
  )
}
