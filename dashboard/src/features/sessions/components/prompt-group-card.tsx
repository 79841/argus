'use client'

import { useState } from 'react'
import { useLocale } from '@/shared/lib/i18n'
import { formatCostDetail, formatCostChart, formatTokens, formatDuration, shortenModel, formatTime } from '@/shared/lib/format'
import type { SessionDetailEvent } from '@/shared/lib/queries'
import type { PromptGroup } from '../hooks/use-session-detail'

const eventLabel = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return `API Request${ev.model ? ` · ${shortenModel(ev.model)}` : ''}`
    case 'tool_result':
      return `Tool: ${ev.tool_name || 'unknown'}${ev.tool_success === 0 ? ' [FAIL]' : ''}`
    case 'user_prompt':
      return 'User Prompt'
    case 'tool_decision':
      return `Tool Decision: ${ev.tool_name || 'unknown'}`
    case 'api_error':
      return 'API Error'
    default:
      return ev.event_name
  }
}

const eventDotColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'bg-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'bg-red-500' : 'bg-emerald-500'
    case 'user_prompt':
      return 'bg-violet-500'
    case 'api_error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

const eventBorderColor = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return 'border-l-blue-500'
    case 'tool_result':
      return ev.tool_success === 0 ? 'border-l-red-500' : 'border-l-emerald-500'
    case 'user_prompt':
      return 'border-l-violet-500'
    case 'api_error':
      return 'border-l-red-500'
    default:
      return 'border-l-gray-300'
  }
}

export type PromptGroupCardProps = {
  group: PromptGroup
  index: number
}

export const PromptGroupCard = ({ group, index }: PromptGroupCardProps) => {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/30"
      >
        <span className="font-mono text-xs text-muted-foreground">
          {t('sessions.detail.promptNum')}{index + 1}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(group.startTime)}</span>
        <span className="text-xs text-muted-foreground">
          ({group.events.length}{t('sessions.promptGroup.events')})
        </span>
        {group.toolCount > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {group.toolCount} {t('sessions.detail.toolCalls')}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs font-medium tabular-nums">
          {formatCostDetail(group.cost)}
        </span>
        <span className="text-muted-foreground">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div>
          {group.events.map((ev, i) => (
            <div
              key={`${ev.timestamp}-${i}`}
              className={`flex items-start gap-3 border-b border-[var(--border-subtle)] border-l-2 px-4 py-2 text-xs last:border-b-0 ${eventBorderColor(ev)}`}
            >
              <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${eventDotColor(ev)}`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{eventLabel(ev)}</div>
                {ev.event_name === 'user_prompt' && (
                  ev.body && !ev.body.includes('REDACTED') && !ev.body.endsWith('.user_prompt') ? (
                    <p className="mt-1 whitespace-pre-wrap break-words rounded bg-violet-50 px-2 py-1.5 text-xs text-foreground dark:bg-violet-950/30">
                      {ev.body}
                    </p>
                  ) : (
                    <p className="mt-1 rounded bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground italic">
                      {t('sessions.detail.promptRedacted')}
                    </p>
                  )
                )}
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
                  <span>{formatTime(ev.timestamp)}</span>
                  {ev.event_name === 'api_request' && (
                    <>
                      <span>in: {formatTokens(ev.input_tokens)}</span>
                      <span>out: {formatTokens(ev.output_tokens)}</span>
                      {ev.cache_read_tokens > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          cache: {formatTokens(ev.cache_read_tokens)}
                        </span>
                      )}
                      <span className="font-medium">{formatCostChart(ev.cost_usd)}</span>
                    </>
                  )}
                  {ev.duration_ms > 0 && <span>{formatDuration(ev.duration_ms)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
