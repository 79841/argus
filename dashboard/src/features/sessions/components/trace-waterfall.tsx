'use client'

import { useState } from 'react'
import type { SessionDetailEvent } from '@/shared/lib/queries'
import {
  groupEventsForWaterfall,
  calculateTimeScale,
  calculateBarPosition,
  type WaterfallGroup,
  type TimeScale,
} from '@/features/sessions/lib/trace-waterfall'
import { formatDuration, formatTime, shortenModel, formatCostDetail } from '@/shared/lib/format'

type TraceWaterfallProps = {
  events: SessionDetailEvent[]
}

const formatCost = (value: number): string =>
  value > 0 ? formatCostDetail(value) : '-'

const EVENT_BAR_COLOR: Record<string, string> = {
  api_request: 'bg-blue-500',
  tool_result_success: 'bg-emerald-500',
  tool_result_fail: 'bg-red-500',
  user_prompt: 'bg-violet-500',
  tool_decision: 'bg-amber-500',
  api_error: 'bg-red-500',
  default: 'bg-gray-400',
}

const getEventBarColor = (ev: SessionDetailEvent): string => {
  if (ev.event_name === 'tool_result') {
    return ev.tool_success === 0 ? EVENT_BAR_COLOR.tool_result_fail : EVENT_BAR_COLOR.tool_result_success
  }
  return EVENT_BAR_COLOR[ev.event_name] ?? EVENT_BAR_COLOR.default
}

const getEventLabel = (ev: SessionDetailEvent): string => {
  switch (ev.event_name) {
    case 'api_request':
      return `API ${ev.model ? shortenModel(ev.model) : 'Request'}`
    case 'tool_result':
      return `${ev.tool_name || 'Tool'}${ev.tool_success === 0 ? ' [FAIL]' : ''}`
    case 'user_prompt':
      return 'User Prompt'
    case 'tool_decision':
      return `Decision: ${ev.tool_name || 'unknown'}`
    case 'api_error':
      return 'API Error'
    default:
      return ev.event_name
  }
}

type TooltipData = {
  event: SessionDetailEvent
  x: number
  y: number
}

type WaterfallRowProps = {
  event: SessionDetailEvent
  scale: TimeScale
  indent?: boolean
  onHover: (data: TooltipData | null, ev?: React.MouseEvent) => void
}

const WaterfallRow = ({ event, scale, indent = false, onHover }: WaterfallRowProps) => {
  const pos = calculateBarPosition(event, scale)
  const barColor = getEventBarColor(event)
  const label = getEventLabel(event)

  return (
    <div
      className="group flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-1 text-xs hover:bg-muted/30 last:border-b-0"
      onMouseEnter={(e) => onHover({ event, x: e.clientX, y: e.clientY }, e)}
      onMouseMove={(e) => onHover({ event, x: e.clientX, y: e.clientY }, e)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Label column */}
      <div
        className="w-[180px] shrink-0 truncate text-muted-foreground"
        style={{ paddingLeft: indent ? '1.25rem' : 0 }}
        title={label}
      >
        {label}
      </div>

      {/* Bar column */}
      <div className="relative h-4 min-w-0 flex-1">
        <div className="absolute inset-y-0 left-0 right-0 rounded-sm bg-muted/30" />
        <div
          className={`absolute inset-y-[3px] rounded-sm ${barColor} opacity-80 group-hover:opacity-100`}
          style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
        />
      </div>

      {/* Duration column */}
      <div className="w-[52px] shrink-0 text-right tabular-nums text-muted-foreground">
        {formatDuration(event.duration_ms)}
      </div>

      {/* Cost column */}
      <div className="w-[52px] shrink-0 text-right tabular-nums">
        {formatCost(event.cost_usd)}
      </div>
    </div>
  )
}

type WaterfallGroupRowProps = {
  group: WaterfallGroup
  index: number
  scale: TimeScale
  onHover: (data: TooltipData | null, ev?: React.MouseEvent) => void
}

const WaterfallGroupRow = ({ group, index, scale, onHover }: WaterfallGroupRowProps) => {
  const [expanded, setExpanded] = useState(index === 0)

  const groupDurationMs = (() => {
    if (group.events.length === 0) return 0
    const start = new Date(group.events[0].timestamp).getTime()
    let end = start
    for (const ev of group.events) {
      const evEnd = new Date(ev.timestamp).getTime() + (ev.duration_ms || 0)
      if (evEnd > end) end = evEnd
    }
    return end - start
  })()

  const groupStartMs = new Date(group.startTime).getTime()
  const leftPct = scale.totalMs > 0
    ? Math.max(0, ((groupStartMs - scale.startMs) / scale.totalMs) * 100)
    : 0
  const widthPct = scale.totalMs > 0
    ? Math.max(0.5, Math.min((groupDurationMs / scale.totalMs) * 100, 100 - leftPct))
    : 0.5

  return (
    <div>
      {/* Group header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 border-b border-[var(--border-subtle)] bg-muted/20 px-3 py-1.5 text-xs hover:bg-muted/40"
      >
        <div className="w-[180px] shrink-0 truncate font-semibold text-foreground">
          <span className="font-mono text-muted-foreground">#{index + 1}</span>
          <span className="ml-2 text-muted-foreground">{formatTime(group.startTime)}</span>
        </div>

        <div className="relative h-4 min-w-0 flex-1">
          <div className="absolute inset-y-0 left-0 right-0 rounded-sm bg-muted/30" />
          <div
            className="absolute inset-y-[2px] rounded-sm bg-foreground/20"
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
        </div>

        <div className="w-[52px] shrink-0 text-right tabular-nums text-muted-foreground">
          {formatDuration(groupDurationMs)}
        </div>

        <div className="w-[52px] shrink-0 text-right tabular-nums font-medium">
          {formatCost(group.cost)}
        </div>

        <span className="ml-1 text-muted-foreground">{expanded ? '▴' : '▾'}</span>
      </button>

      {/* Event rows */}
      {expanded && group.events.map((ev, i) => (
        <WaterfallRow
          key={`${ev.timestamp}-${i}`}
          event={ev}
          scale={scale}
          indent
          onHover={onHover}
        />
      ))}
    </div>
  )
}

type TooltipProps = {
  data: TooltipData
}

const WaterfallTooltip = ({ data }: TooltipProps) => {
  const { event, x, y } = data

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded-lg border bg-popover p-3 text-xs shadow-lg"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="mb-1 font-semibold">{getEventLabel(event)}</div>
      <div className="space-y-0.5 text-muted-foreground">
        <div>{formatTime(event.timestamp)}</div>
        {event.duration_ms > 0 && <div>Duration: {formatDuration(event.duration_ms)}</div>}
        {event.event_name === 'api_request' && (
          <>
            {event.model && <div>Model: {shortenModel(event.model)}</div>}
            <div>Input: {event.input_tokens.toLocaleString()} tok</div>
            <div>Output: {event.output_tokens.toLocaleString()} tok</div>
            {event.cache_read_tokens > 0 && (
              <div className="text-emerald-600 dark:text-emerald-400">
                Cache: {event.cache_read_tokens.toLocaleString()} tok
              </div>
            )}
            {event.cost_usd > 0 && <div>Cost: {formatCost(event.cost_usd)}</div>}
          </>
        )}
        {event.event_name === 'tool_result' && event.tool_name && (
          <div>Tool: {event.tool_name}</div>
        )}
        {event.event_name === 'user_prompt' && event.body && (
          <div className="mt-1 max-h-20 overflow-hidden whitespace-pre-wrap break-words text-foreground">
            {event.body.length > 150 ? event.body.slice(0, 150) + '...' : event.body}
          </div>
        )}
      </div>
    </div>
  )
}

export const TraceWaterfall = ({ events }: TraceWaterfallProps) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const groups = groupEventsForWaterfall(events)
  const scale = calculateTimeScale(events)

  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        이벤트 없음
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-muted-foreground">
        <div className="w-[180px] shrink-0">Name</div>
        <div className="min-w-0 flex-1 text-center">Timeline</div>
        <div className="w-[52px] shrink-0 text-right">Duration</div>
        <div className="w-[52px] shrink-0 text-right">Cost</div>
        <div className="ml-1 w-3" />
      </div>

      {/* Groups */}
      <div className="rounded-b-lg">
        {groups.map((group, idx) => (
          <WaterfallGroupRow
            key={group.promptId}
            group={group}
            index={idx}
            scale={scale}
            onHover={setTooltip}
          />
        ))}
      </div>

      {tooltip && <WaterfallTooltip data={tooltip} />}
    </div>
  )
}
