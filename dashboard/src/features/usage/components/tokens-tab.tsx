'use client'

import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { TOKEN_COLORS, CHART_THEME } from '@/shared/lib/chart-theme'
import { formatTokens } from '@/shared/lib/format'
import { useLocale } from '@/shared/lib/i18n'
import { useTokensData } from '../hooks/use-tokens-data'
import type { TokensTabProps } from '@/features/usage/types/usage'

export const TokensTab = ({ agentType, project, dateRange }: TokensTabProps) => {
  const { t } = useLocale()
  const { daily, agentTokens, overview } = useTokensData({ agentType, project, dateRange })

  const totalInput = overview?.total_input_tokens ?? 0
  const totalOutput = overview?.total_output_tokens ?? 0
  const totalCache = overview?.total_cache_read_tokens ?? 0
  const totalTokens = totalInput + totalOutput + totalCache
  const inputRatio = totalInput + totalOutput > 0 ? ((totalInput / (totalInput + totalOutput)) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('usage.kpi.totalTokens')} value={formatTokens(totalTokens)} sub={t('usage.kpi.inputOutputCache')} />
        <KpiCard label={t('usage.kpi.inputOutputRatio')} value={`${inputRatio}%`} sub={t('usage.kpi.inputProportion')} />
        <KpiCard label={t('usage.kpi.cacheSavings')} value={formatTokens(totalCache)} sub={t('usage.kpi.tokensFromCache')} />
      </div>

      <ChartCard title={t('usage.chart.dailyTokenUsage')} height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatTokens(v)} width={55} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatTokens(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Bar dataKey="input" stackId="a" fill={TOKEN_COLORS.input} name={t('usage.token.input')} />
            <Bar dataKey="output" stackId="a" fill={TOKEN_COLORS.output} name={t('usage.token.output')} />
            <Bar dataKey="cache_read" stackId="a" fill={TOKEN_COLORS.cache_read} name={t('usage.token.cacheRead')} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t('usage.chart.tokenDistByAgent')} height={160} empty={agentTokens.length === 0}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={agentTokens} layout="vertical" margin={{ left: 0, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatTokens(v)} />
            <YAxis type="category" dataKey="agent" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatTokens(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Bar dataKey="input" stackId="a" fill={TOKEN_COLORS.input} name={t('usage.token.input')} />
            <Bar dataKey="output" stackId="a" fill={TOKEN_COLORS.output} name={t('usage.token.output')} />
            <Bar dataKey="cache_read" stackId="a" fill={TOKEN_COLORS.cache_read} name={t('usage.token.cacheRead')} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
