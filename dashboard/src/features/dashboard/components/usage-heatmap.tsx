'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { DailyStats } from '@/shared/lib/queries'
import { getAgentColor, AGENTS } from '@/shared/lib/agents'
import { useLocale } from '@/shared/lib/i18n'

type HeatmapMode = 'agents' | 'sessions' | 'cost' | 'efficiency'

type UsageHeatmapProps = {
  data: DailyStats[]
  agentType: string
}

type DayData = {
  date: string
  sessions: number
  cost: number
  cacheHitRate: number
  agents: Set<string>
}

const AGENT_COLORS: Record<string, string> = {
  claude: AGENTS.claude.hex,
  codex: AGENTS.codex.hex,
  gemini: AGENTS.gemini.hex,
}

const AGENT_LABELS: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKS_TO_SHOW = 13

const getSessionColor = (value: number, max: number, agentHex: string): string => {
  if (value === 0) return 'var(--color-muted)'
  const intensity = Math.min(value / Math.max(max, 1), 1)
  const alpha = 0.15 + intensity * 0.85
  return `color-mix(in srgb, ${agentHex} ${Math.round(alpha * 100)}%, transparent)`
}

const getCostColor = (value: number, max: number): string => {
  if (value === 0) return 'var(--color-muted)'
  const ratio = Math.min(value / Math.max(max, 1), 1)
  if (ratio < 0.5) {
    const t = ratio * 2
    const r = Math.round(187 + (234 - 187) * t)
    const g = Math.round(247 + (179 - 247) * t)
    const b = Math.round(208 + (8 - 208) * t)
    return `rgb(${r},${g},${b})`
  }
  const t = (ratio - 0.5) * 2
  const r = Math.round(234 + (239 - 234) * t)
  const g = Math.round(179 + (68 - 179) * t)
  const b = Math.round(8 + (68 - 8) * t)
  return `rgb(${r},${g},${b})`
}

const getEfficiencyColor = (rate: number): string => {
  if (rate < 0) return 'var(--color-muted)'
  if (rate < 0.3) {
    const t = rate / 0.3
    const r = Math.round(239 + (234 - 239) * t)
    const g = Math.round(68 + (179 - 68) * t)
    const b = Math.round(68 + (8 - 68) * t)
    return `rgb(${r},${g},${b})`
  }
  const t = Math.min((rate - 0.3) / 0.7, 1)
  const r = Math.round(234 + (34 - 234) * t)
  const g = Math.round(179 + (197 - 179) * t)
  const b = Math.round(8 + (94 - 8) * t)
  return `rgb(${r},${g},${b})`
}

const getAgentCellStyle = (agents: Set<string>): React.CSSProperties => {
  if (agents.size === 0) return { backgroundColor: 'var(--color-muted)' }

  const sorted = ['claude', 'codex', 'gemini'].filter((a) => agents.has(a))
  if (sorted.length === 1) {
    return { backgroundColor: AGENT_COLORS[sorted[0]] }
  }

  const colors = sorted.map((a) => AGENT_COLORS[a])
  return { background: `linear-gradient(135deg, ${colors.join(', ')})` }
}

const formatCostShort = (v: number): string => {
  if (v >= 1) return `$${v.toFixed(1)}`
  if (v >= 0.01) return `$${v.toFixed(2)}`
  if (v > 0) return `$${v.toFixed(3)}`
  return '$0'
}

export const UsageHeatmap = ({ data, agentType }: UsageHeatmapProps) => {
  const [mode, setMode] = useState<HeatmapMode>('agents')
  const { t } = useLocale()

  const { grid, months, maxSessions, maxCost } = useMemo(() => {
    const today = new Date()
    const dayMap = new Map<string, DayData>()

    for (const d of data) {
      const key = d.date
      const existing = dayMap.get(key)
      if (existing) {
        existing.sessions += d.sessions
        existing.cost += d.cost
        if (d.agent_type && d.sessions > 0) {
          existing.agents.add(d.agent_type)
        }
        const totalInput = (d.input_tokens ?? 0) + (d.cache_read_tokens ?? 0)
        if (totalInput > 0) {
          const newRate = (d.cache_read_tokens ?? 0) / totalInput
          if (existing.cacheHitRate < 0) {
            existing.cacheHitRate = newRate
          } else {
            existing.cacheHitRate = (existing.cacheHitRate + newRate) / 2
          }
        }
      } else {
        const totalInput = (d.input_tokens ?? 0) + (d.cache_read_tokens ?? 0)
        const agents = new Set<string>()
        if (d.agent_type && d.sessions > 0) {
          agents.add(d.agent_type)
        }
        dayMap.set(key, {
          date: key,
          sessions: d.sessions,
          cost: d.cost,
          cacheHitRate: totalInput > 0 ? (d.cache_read_tokens ?? 0) / totalInput : -1,
          agents,
        })
      }
    }

    const totalDays = WEEKS_TO_SHOW * 7
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - totalDays + 1)
    const startDow = startDate.getDay()
    startDate.setDate(startDate.getDate() - startDow)

    const cells: (DayData | null)[][] = []
    const monthLabels: { label: string; weekIdx: number }[] = []
    let lastMonth = -1

    const cursor = new Date(startDate)
    for (let w = 0; w < WEEKS_TO_SHOW + 1; w++) {
      const week: (DayData | null)[] = []
      for (let d = 0; d < 7; d++) {
        if (cursor > today) {
          week.push(null)
        } else {
          const key = cursor.toISOString().slice(0, 10)
          week.push(dayMap.get(key) ?? { date: key, sessions: 0, cost: 0, cacheHitRate: -1, agents: new Set() })
        }
        if (d === 0 && cursor.getMonth() !== lastMonth && cursor <= today) {
          lastMonth = cursor.getMonth()
          monthLabels.push({
            label: cursor.toLocaleString('en', { month: 'short' }),
            weekIdx: w,
          })
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      cells.push(week)
    }

    let mxS = 0
    let mxC = 0
    for (const week of cells) {
      for (const cell of week) {
        if (cell) {
          if (cell.sessions > mxS) mxS = cell.sessions
          if (cell.cost > mxC) mxC = cell.cost
        }
      }
    }

    return { grid: cells, months: monthLabels, maxSessions: mxS, maxCost: mxC }
  }, [data])

  const agentHex = getAgentColor(agentType)
  const cellSize = 13
  const cellGap = 2

  const getCellStyle = (cell: DayData | null): React.CSSProperties => {
    if (!cell) return { backgroundColor: 'transparent' }
    if (mode === 'agents') {
      if (cell.sessions === 0) return { backgroundColor: 'var(--color-muted)' }
      return getAgentCellStyle(cell.agents)
    }
    const color = mode === 'sessions'
      ? getSessionColor(cell.sessions, maxSessions, agentHex)
      : mode === 'cost'
        ? getCostColor(cell.cost, maxCost)
        : getEfficiencyColor(cell.cacheHitRate)
    return { backgroundColor: color }
  }

  const getTooltipText = (cell: DayData | null): string => {
    if (!cell) return ''
    const dateStr = new Date(cell.date + 'T00:00:00').toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const parts = [dateStr, `${cell.sessions} sessions`, formatCostShort(cell.cost)]
    if (cell.cacheHitRate >= 0) {
      parts.push(`Cache: ${(cell.cacheHitRate * 100).toFixed(0)}%`)
    }
    if (cell.agents.size > 0) {
      const agentNames = [...cell.agents]
        .map((a) => AGENT_LABELS[a] ?? a)
        .join(', ')
      parts.push(agentNames)
    }
    return parts.join(' / ')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('dashboard.heatmap.title')}</CardTitle>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as HeatmapMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="agents" className="text-xs px-2 py-0.5">{t('dashboard.heatmap.agents')}</TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs px-2 py-0.5">{t('dashboard.heatmap.sessions')}</TabsTrigger>
              <TabsTrigger value="cost" className="text-xs px-2 py-0.5">{t('dashboard.heatmap.cost')}</TabsTrigger>
              <TabsTrigger value="efficiency" className="text-xs px-2 py-0.5">{t('dashboard.heatmap.cache')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5">
            <div className="flex flex-col justify-end pr-1" style={{ gap: cellGap }}>
              {DAYS_OF_WEEK.filter((_, i) => i % 2 === 1).map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-muted-foreground leading-none"
                  style={{ height: cellSize + cellGap, display: 'flex', alignItems: 'center' }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div>
              <div className="flex mb-0.5" style={{ gap: cellGap }}>
                {grid.map((_, wIdx) => {
                  const ml = months.find((m) => m.weekIdx === wIdx)
                  return (
                    <div
                      key={wIdx}
                      className="text-[10px] text-muted-foreground leading-none"
                      style={{ width: cellSize, textAlign: 'left' }}
                    >
                      {ml?.label ?? ''}
                    </div>
                  )
                })}
              </div>
              <div className="flex" style={{ gap: cellGap }}>
                {grid.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col" style={{ gap: cellGap }}>
                    {week.map((cell, dIdx) => (
                      <div
                        key={dIdx}
                        className="rounded-[2px]"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          ...getCellStyle(cell),
                        }}
                        title={getTooltipText(cell)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {mode === 'agents' && (
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
              {(['claude', 'codex', 'gemini'] as const).map((agent) => (
                <div key={agent} className="flex items-center gap-1">
                  <div
                    className="size-2.5 rounded-[2px]"
                    style={{ backgroundColor: AGENT_COLORS[agent] }}
                  />
                  {AGENT_LABELS[agent]}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
