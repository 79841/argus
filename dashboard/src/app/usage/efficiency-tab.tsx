'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/ui/data-table'
import { AgentBadge } from '@/components/ui/agent-badge'
import { efficiencyService } from '@/shared/services'
import { AGENTS } from '@/lib/agents'
import { AGENT_CHART_COLORS, CHART_THEME } from '@/lib/chart-theme'
import { calculateEfficiency } from '@/lib/efficiency'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import type { EfficiencyRow, EfficiencyComparisonRow } from '@/lib/queries'
import type { EfficiencyAgentRow, EfficiencyTrendPoint, EfficiencyTabProps } from '@/types/usage'

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

const efficiencyColumns = [
  {
    key: 'agent_type',
    label: 'Agent',
    format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
  },
  { key: 'cache_rate', label: 'Cache Rate', align: 'right' as const, format: (v: unknown) => `${Number(v).toFixed(1)}%` },
  { key: 'token_efficiency', label: 'Token Eff.', align: 'right' as const, format: (v: unknown) => Number(v).toFixed(2) },
  { key: 'avg_duration_s', label: 'Avg Speed', align: 'right' as const, format: (v: unknown) => `${Number(v).toFixed(2)}s` },
  { key: 'score', label: 'Score', align: 'right' as const, format: (v: unknown) => <span className="font-semibold">{String(v)}</span> },
]

export const EfficiencyTab = ({ project, dateRange }: EfficiencyTabProps) => {
  const [agentRows, setAgentRows] = useState<EfficiencyAgentRow[]>([])
  const [trend, setTrend] = useState<EfficiencyTrendPoint[]>([])
  const [overall, setOverall] = useState<{ cacheRate: number; avgDuration: number; score: number } | null>(null)

  useEffect(() => {
    efficiencyService.getEfficiency({ project, from: dateRange.from, to: dateRange.to })
      .then((res) => {
        const { data, comparison } = res as { data: EfficiencyRow[]; comparison: { current: EfficiencyComparisonRow[]; previous: EfficiencyComparisonRow[] } }
        const trendMap: Record<string, EfficiencyTrendPoint> = {}
        for (const row of data) {
          if (!trendMap[row.date]) trendMap[row.date] = { date: row.date }
          const eff = calculateEfficiency({
            cacheReadTokens: row.total_cache_read,
            inputTokens: row.total_input,
            outputTokens: row.total_output,
            requestCount: row.total_requests,
            costUsd: row.cost,
            totalDurationMs: row.total_duration_ms,
          })
          trendMap[row.date][row.agent_type] = eff.score
        }
        setTrend(Object.values(trendMap).sort((a, b) => String(a.date).localeCompare(String(b.date))))

        const rows = comparison.current.map(cur => {
          const eff = calculateEfficiency({
            cacheReadTokens: cur.total_cache_read,
            inputTokens: cur.total_input,
            outputTokens: cur.total_output,
            requestCount: cur.total_requests,
            costUsd: cur.cost,
            totalDurationMs: cur.total_duration_ms,
          })
          const cacheRate = cur.total_cache_read + cur.total_input > 0
            ? (cur.total_cache_read / (cur.total_cache_read + cur.total_input)) * 100
            : 0
          return {
            agent_type: cur.agent_type,
            cache_rate: cacheRate,
            token_efficiency: eff.tokenEfficiency,
            avg_duration_s: eff.avgDurationMs / 1000,
            score: eff.score,
          }
        })
        setAgentRows(rows)

        const allCur = comparison.current
        const totalCacheRead = allCur.reduce((s, r) => s + r.total_cache_read, 0)
        const totalInput = allCur.reduce((s, r) => s + r.total_input, 0)
        const totalRequests = allCur.reduce((s, r) => s + r.total_requests, 0)
        const totalDuration = allCur.reduce((s, r) => s + r.total_duration_ms, 0)
        const totalCost = allCur.reduce((s, r) => s + r.cost, 0)
        const totalOutput = allCur.reduce((s, r) => s + r.total_output, 0)
        const effAll = calculateEfficiency({ cacheReadTokens: totalCacheRead, inputTokens: totalInput, outputTokens: totalOutput, requestCount: totalRequests, costUsd: totalCost, totalDurationMs: totalDuration })
        setOverall({
          cacheRate: (totalCacheRead + totalInput) > 0 ? (totalCacheRead / (totalCacheRead + totalInput)) * 100 : 0,
          avgDuration: effAll.avgDurationMs / 1000,
          score: effAll.score,
        })
      })
      .catch(() => {})
  }, [project, dateRange])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Cache Hit Rate" value={overall ? `${overall.cacheRate.toFixed(1)}%` : '-'} sub="cache_read / total input" />
        <KpiCard label="Avg Response Time" value={overall ? `${overall.avgDuration.toFixed(2)}s` : '-'} sub="per API request" />
        <KpiCard label="Efficiency Score" value={overall ? `${overall.score}` : '-'} sub="composite score (0-100)" />
      </div>

      <ChartCard title="Efficiency Trend" height={180} empty={trend.length === 0}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} />
            <Legend {...CHART_THEME.legend} />
            {AGENT_TYPES.map(id => (
              <Line key={id} type="monotone" dataKey={id} stroke={AGENT_CHART_COLORS[id]} dot={false} name={AGENTS[id].name} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Efficiency by Agent">
        <DataTable
          columns={efficiencyColumns}
          data={agentRows as unknown as Record<string, unknown>[]}
          emptyMessage="No efficiency data"
        />
      </ChartCard>
    </div>
  )
}
