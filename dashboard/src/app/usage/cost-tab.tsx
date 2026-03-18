'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { dataClient } from '@/lib/data-client'
import { AGENTS } from '@/lib/agents'
import { AGENT_CHART_COLORS, CHART_THEME } from '@/lib/chart-theme'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import type { DailyStats, OverviewStats } from '@/lib/queries'
import { formatCost, formatCostChart } from '@/lib/format'

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

type DailyCostPoint = {
  date: string
  claude: number
  codex: number
  gemini: number
  total: number
}

type AgentCostPoint = { agent: string; cost: number; agentId: AgentType }
type ProjectCostPoint = { project: string; cost: number }

type CostTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

export const CostTab = ({ agentType, project, dateRange }: CostTabProps) => {
  const [daily, setDaily] = useState<DailyCostPoint[]>([])
  const [agentCosts, setAgentCosts] = useState<AgentCostPoint[]>([])
  const [projectCosts, setProjectCosts] = useState<ProjectCostPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [prevOverview, setPrevOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    dataClient.query('daily', { agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((rows) => {
        const typedRows = rows as DailyStats[]
        const byDate: Record<string, DailyCostPoint> = {}
        for (const row of typedRows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, claude: 0, codex: 0, gemini: 0, total: 0 }
          const point = byDate[row.date]
          point[row.agent_type as 'claude' | 'codex' | 'gemini'] = row.cost
          point.total += row.cost
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, number> = {}
        for (const row of typedRows) {
          agentMap[row.agent_type] = (agentMap[row.agent_type] ?? 0) + row.cost
        }
        setAgentCosts(
          AGENT_TYPES.map(id => ({ agent: AGENTS[id].name, cost: agentMap[id] ?? 0, agentId: id }))
            .filter(a => a.cost > 0)
        )
      })
      .catch(() => {})

    dataClient.query('overview', { agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
      .then((data) => setOverview(data as OverviewStats))
      .catch(() => {})

    const from = new Date(dateRange.from)
    const to = new Date(dateRange.to)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - days + 1)
    dataClient.query('overview', { agent_type: agentType, project, from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) })
      .then((data) => setPrevOverview(data as OverviewStats))
      .catch(() => {})

    dataClient.query('projects', { agent_type: agentType, from: dateRange.from, to: dateRange.to })
      .then((data) => {
        const typedData = data as Array<{ project_name: string; total_cost: number }>
        setProjectCosts(typedData.map(d => ({ project: d.project_name, cost: d.total_cost })))
      })
      .catch(() => {})
  }, [agentType, project, dateRange])

  const totalCost = overview?.total_cost ?? 0
  const days = Math.max(1, Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const avgCost = totalCost / days
  const delta = overview && prevOverview && prevOverview.total_cost > 0
    ? ((totalCost - prevOverview.total_cost) / prevOverview.total_cost) * 100
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Cost" value={formatCost(totalCost)} delta={delta} deltaInverted />
        <KpiCard label="Daily Average" value={formatCost(avgCost)} sub="per day" />
        <KpiCard label="Requests" value={(overview?.total_requests ?? 0).toLocaleString()} sub="API requests" />
      </div>

      <ChartCard title="Daily Cost Trend" height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatCost(v)} width={55} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), '']} />
            <Legend {...CHART_THEME.legend} />
            <Area type="monotone" dataKey="claude" stackId="1" stroke={AGENT_CHART_COLORS.claude} fill={AGENT_CHART_COLORS.claude} fillOpacity={0.15} name="Claude" />
            <Area type="monotone" dataKey="codex" stackId="1" stroke={AGENT_CHART_COLORS.codex} fill={AGENT_CHART_COLORS.codex} fillOpacity={0.15} name="Codex" />
            <Area type="monotone" dataKey="gemini" stackId="1" stroke={AGENT_CHART_COLORS.gemini} fill={AGENT_CHART_COLORS.gemini} fillOpacity={0.15} name="Gemini" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
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

        <ChartCard title="Cost by Project" height={160} empty={projectCosts.length === 0} emptyMessage="No project data">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={projectCosts.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => formatCost(v)} />
              <YAxis type="category" dataKey="project" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [formatCostChart(Number(v)), 'Cost']} />
              <Bar dataKey="cost" fill={AGENT_CHART_COLORS.all} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
