'use client'

import { useLocale } from '@/shared/lib/i18n'
import { AGENTS } from '@/shared/lib/agents'
import { formatCostDetail, formatDuration } from '@/shared/lib/format'
import type { AgentType } from '@/shared/lib/agents'
import type { SessionSummary } from '../lib/session-completion'

type SessionToastProps = {
  summary: SessionSummary
  onClose: () => void
}

const BORDER_CLASS: Record<string, string> = {
  orange: 'border-orange-500',
  emerald: 'border-emerald-500',
  blue: 'border-blue-500',
  violet: 'border-violet-500',
}

export const SessionToast = ({ summary, onClose }: SessionToastProps) => {
  const { t } = useLocale()

  const agent = AGENTS[summary.agentType as AgentType]
  const agentName = agent?.name ?? summary.agentType
  const borderColor = BORDER_CLASS[agent?.color ?? 'violet'] ?? 'border-violet-500'

  const costStr = formatCostDetail(summary.cost)
  const durationStr = formatDuration(summary.durationMs)
  const summaryText = t('pip.session.summary', {
    cost: costStr,
    count: String(summary.eventCount),
    duration: durationStr,
  })
  const titleText = t('pip.session.complete', { agent: agentName })

  return (
    <div
      className={`flex items-start gap-3 rounded-lg bg-gray-900 border-l-4 ${borderColor} px-4 py-3 shadow-lg animate-in slide-in-from-right-4 fade-in-0 duration-200 min-w-[280px] max-w-[360px]`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{titleText}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{summaryText}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
