'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { dailyService, overviewService } from '@/shared/services'
import { AGENTS } from '@/lib/agents'
import { AGENT_CHART_COLORS, TOKEN_COLORS, CHART_THEME } from '@/lib/chart-theme'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import type { DailyStats, OverviewStats } from '@/lib/queries'
import type { DailyTokenPoint, AgentTokenPoint, TokensTabProps } from '@/types/usage'

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

export const TokensTab = ({ agentType, project, dateRange }: TokensTabProps) => {
  const [daily, setDaily] = useState<DailyTokenPoint[]>([])
  const [agentTokens, setAgentTokens] = useState<AgentTokenPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    dailyService.getDailyStats({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((rows) => {
        const typedRows = rows as DailyStats[]
        const byDate: Record<string, DailyTokenPoint> = {}
        for (const row of typedRows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, input: 0, output: 0, cache_read: 0 }
          byDate[row.date].input += row.input_tokens
          byDate[row.date].output += row.output_tokens
          byDate[row.date].cache_read += row.cache_read_tokens
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, { input: number; output: number; cache_read: number }> = {}
        for (const row of typedRows) {
          if (!agentMap[row.agent_type]) agentMap[row.agent_type] = { input: 0, output: 0, cache_read: 0 }
          agentMap[row.agent_type].input += row.input_tokens
          agentMap[row.agent_type].output += row.output_tokens
          agentMap[row.agent_type].cache_read += row.cache_read_tokens
        }
        setAgentTokens(
          AGENT_TYPES.map(id => ({
            agent: AGENTS[id].name,
            input: agentMap[id]?.input ?? 0,
            output: agentMap[id]?.output ?? 0,
            cache_read: agentMap[id]?.cache_read ?? 0,
            agentId: id,
          })).filter(a => a.input + a.output + a.cache_read > 0)
        )
      })
      .catch(() => {})

    overviewService.getOverview({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((data) => setOverview(data as OverviewStats))
      .catch(() => {})
  }, [agentType, project, dateRange])

  const totalInput = overview?.total_input_tokens ?? 0
  const totalOutput = overview?.total_output_tokens ?? 0
  const totalCache = overview?.total_cache_read_tokens ?? 0
  const totalTokens = totalInput + totalOutput + totalCache
  const inputRatio = totalInput + totalOutput > 0 ? ((totalInput / (totalInput + totalOutput)) * 100).toFixed(1) : '0.0'

  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Tokens" value={fmtTokens(totalTokens)} sub="input + output + cache" />
        <KpiCard label="Input / Output Ratio" value={`${inputRatio}%`} sub="input proportion" />
        <KpiCard label="Cache Savings" value={fmtTokens(totalCache)} sub="tokens served from cache" />
      </div>

      <ChartCard title="Daily Token Usage" height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => fmtTokens(v)} width={55} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [fmtTokens(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Bar dataKey="input" stackId="a" fill={TOKEN_COLORS.input} name="Input" />
            <Bar dataKey="output" stackId="a" fill={TOKEN_COLORS.output} name="Output" />
            <Bar dataKey="cache_read" stackId="a" fill={TOKEN_COLORS.cache_read} name="Cache Read" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Token Distribution by Agent" height={160} empty={agentTokens.length === 0}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={agentTokens} layout="vertical" margin={{ left: 0, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => fmtTokens(v)} />
            <YAxis type="category" dataKey="agent" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [fmtTokens(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Bar dataKey="input" stackId="a" fill={TOKEN_COLORS.input} name="Input" />
            <Bar dataKey="output" stackId="a" fill={TOKEN_COLORS.output} name="Output" />
            <Bar dataKey="cache_read" stackId="a" fill={TOKEN_COLORS.cache_read} name="Cache" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
