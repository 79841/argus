'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { KpiCard } from '@/shared/components/ui/kpi-card'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { AGENT_CHART_COLORS, CHART_THEME } from '@/shared/lib/chart-theme'
import { formatCost, formatCostChart } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { useCostData } from '../hooks/use-cost-data'
import type { CostTabProps } from '@/features/usage/types/usage'

export const CostTab = ({ agentType, project, dateRange }: CostTabProps) => {
  const { daily, agentCosts, projectCosts, overview, prevOverview } = useCostData({ agentType, project, dateRange })

  const totalCost = overview?.total_cost ?? 0
  const days = Math.max(1, Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const avgCost = totalCost / days
  const delta = overview && prevOverview && prevOverview.total_cost > 0
    ? ((totalCost - prevOverview.total_cost) / prevOverview.total_cost) * 100
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Cost" value={formatCost(totalCost)} delta={delta} deltaInverted />
        <KpiCard label="Daily Average" value={formatCost(avgCost)} sub="per day" />
        <KpiCard label="Requests" value={(overview?.total_requests ?? 0).toLocaleString()} sub="API requests" />
      </div>

      <ChartCard title="Daily Cost Trend" height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatCost(v)} width={55} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Area type="monotone" dataKey="claude" stackId="1" stroke={AGENT_CHART_COLORS.claude} fill={AGENT_CHART_COLORS.claude} fillOpacity={0.15} name="Claude" />
            <Area type="monotone" dataKey="codex" stackId="1" stroke={AGENT_CHART_COLORS.codex} fill={AGENT_CHART_COLORS.codex} fillOpacity={0.15} name="Codex" />
            <Area type="monotone" dataKey="gemini" stackId="1" stroke={AGENT_CHART_COLORS.gemini} fill={AGENT_CHART_COLORS.gemini} fillOpacity={0.15} name="Gemini" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className={cn('grid gap-4', project !== 'all' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
        <ChartCard title="Cost by Agent" height={160}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agentCosts} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatCost(v)} />
              <YAxis type="category" dataKey="agent" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), 'Cost']} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {agentCosts.map((entry) => (
                  <Cell key={entry.agent} fill={AGENT_CHART_COLORS[entry.agentId]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {project === 'all' && <ChartCard title="Cost by Project" height={160} empty={projectCosts.length === 0} emptyMessage="No project data">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={projectCosts.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatCost(v)} />
              <YAxis type="category" dataKey="project" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={120} tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 14)}…` : v} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), 'Cost']} />
              <Bar dataKey="cost" fill={AGENT_CHART_COLORS.all} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>}
      </div>
    </div>
  )
}
