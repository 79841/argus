'use client'

import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { TOKEN_COLORS, CHART_THEME } from '@/lib/chart-theme'
import { useTokensData } from '../hooks/use-tokens-data'
import type { TokensTabProps } from '@/types/usage'

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString()

export const TokensTab = ({ agentType, project, dateRange }: TokensTabProps) => {
  const { daily, agentTokens, overview } = useTokensData({ agentType, project, dateRange })

  const totalInput = overview?.total_input_tokens ?? 0
  const totalOutput = overview?.total_output_tokens ?? 0
  const totalCache = overview?.total_cache_read_tokens ?? 0
  const totalTokens = totalInput + totalOutput + totalCache
  const inputRatio = totalInput + totalOutput > 0 ? ((totalInput / (totalInput + totalOutput)) * 100).toFixed(1) : '0.0'

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
