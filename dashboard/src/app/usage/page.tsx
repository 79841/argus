'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { AgentFilter } from '@/components/agent-filter'
import { ProjectFilter } from '@/components/project-filter'
import { DateRangePicker } from '@/components/date-range-picker'
import { ConfigTimeline } from '@/components/config-timeline'
import { FilterBar } from '@/components/filter-bar'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentBadge } from '@/components/ui/agent-badge'
import { AGENTS } from '@/lib/agents'
import { AGENT_CHART_COLORS, TOKEN_COLORS, CHART_THEME } from '@/lib/chart-theme'
import { calculateEfficiency } from '@/lib/efficiency'
import type { AgentType } from '@/lib/agents'
import type { DateRange } from '@/components/top-bar-context'
import type { DailyStats, OverviewStats, ModelUsage, EfficiencyRow, EfficiencyComparisonRow } from '@/lib/queries'
import type { ConfigChange } from '@/lib/config-tracker'
import type { ReactNode } from 'react'

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 10)
}

const AGENT_TYPES: AgentType[] = ['claude', 'codex', 'gemini']

// ─── Cost Tab ───────────────────────────────────────────────────────────────

type CostTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type DailyCostPoint = {
  date: string
  claude: number
  codex: number
  gemini: number
  total: number
}

type AgentCostPoint = { agent: string; cost: number; agentId: AgentType }
type ProjectCostPoint = { project: string; cost: number }

const CostTab = ({ agentType, project, dateRange }: CostTabProps) => {
  const [daily, setDaily] = useState<DailyCostPoint[]>([])
  const [agentCosts, setAgentCosts] = useState<AgentCostPoint[]>([])
  const [projectCosts, setProjectCosts] = useState<ProjectCostPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [prevOverview, setPrevOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
    fetch(`/api/daily?${qs}`)
      .then(r => r.json())
      .then((rows: DailyStats[]) => {
        const byDate: Record<string, DailyCostPoint> = {}
        for (const row of rows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, claude: 0, codex: 0, gemini: 0, total: 0 }
          const point = byDate[row.date]
          point[row.agent_type as 'claude' | 'codex' | 'gemini'] = row.cost
          point.total += row.cost
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, number> = {}
        for (const row of rows) {
          agentMap[row.agent_type] = (agentMap[row.agent_type] ?? 0) + row.cost
        }
        setAgentCosts(
          AGENT_TYPES.map(id => ({ agent: AGENTS[id].name, cost: agentMap[id] ?? 0, agentId: id }))
            .filter(a => a.cost > 0)
        )
      })
      .catch(() => {})

    fetch(`/api/overview?${qs}`)
      .then(r => r.json())
      .then(data => setOverview(data))
      .catch(() => {})

    const from = new Date(dateRange.from)
    const to = new Date(dateRange.to)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - days + 1)
    const prevQs = new URLSearchParams({ agent_type: agentType, project, from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) })
    fetch(`/api/overview?${prevQs}`)
      .then(r => r.json())
      .then(data => setPrevOverview(data))
      .catch(() => {})

    fetch(`/api/projects?agent_type=${agentType}&from=${dateRange.from}&to=${dateRange.to}`)
      .then(r => r.json())
      .then((data: Array<{ project_name: string; total_cost: number }>) =>
        setProjectCosts(data.map(d => ({ project: d.project_name, cost: d.total_cost })))
      )
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
        <KpiCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} delta={delta} deltaInverted />
        <KpiCard label="Daily Average" value={`$${avgCost.toFixed(2)}`} sub="per day" />
        <KpiCard label="Requests" value={(overview?.total_requests ?? 0).toLocaleString()} sub="API requests" />
      </div>

      <ChartCard title="Daily Cost Trend" height={220}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} width={55} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, '']} />
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
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} />
              <YAxis type="category" dataKey="agent" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
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
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} />
              <YAxis type="category" dataKey="project" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} width={80} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
              <Bar dataKey="cost" fill={AGENT_CHART_COLORS.all} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

// ─── Tokens Tab ─────────────────────────────────────────────────────────────

type TokensTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type DailyTokenPoint = {
  date: string
  input: number
  output: number
  cache_read: number
}

type AgentTokenPoint = { agent: string; input: number; output: number; cache_read: number; agentId: AgentType }

const TokensTab = ({ agentType, project, dateRange }: TokensTabProps) => {
  const [daily, setDaily] = useState<DailyTokenPoint[]>([])
  const [agentTokens, setAgentTokens] = useState<AgentTokenPoint[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })

    fetch(`/api/daily?${qs}`)
      .then(r => r.json())
      .then((rows: DailyStats[]) => {
        const byDate: Record<string, DailyTokenPoint> = {}
        for (const row of rows) {
          if (!byDate[row.date]) byDate[row.date] = { date: row.date, input: 0, output: 0, cache_read: 0 }
          byDate[row.date].input += row.input_tokens
          byDate[row.date].output += row.output_tokens
          byDate[row.date].cache_read += row.cache_read_tokens
        }
        setDaily(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))

        const agentMap: Record<string, { input: number; output: number; cache_read: number }> = {}
        for (const row of rows) {
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

    fetch(`/api/overview?${qs}`)
      .then(r => r.json())
      .then(data => setOverview(data))
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

// ─── Models Tab ─────────────────────────────────────────────────────────────

type ModelsTabProps = {
  agentType: AgentType
  project: string
  dateRange: DateRange
}

type ModelTableRow = {
  model: string
  agent_type: string
  request_count: number
  cost: number
  avg_cost: number
}

const SERIES_PIE_COLORS = [
  'oklch(0.55 0 0)',
  'oklch(0.65 0 0)',
  'oklch(0.45 0 0)',
  'oklch(0.75 0 0)',
  'oklch(0.35 0 0)',
  'oklch(0.60 0 0)',
  'oklch(0.70 0 0)',
  'oklch(0.40 0 0)',
]

const ModelsTab = ({ agentType, project, dateRange }: ModelsTabProps) => {
  const [models, setModels] = useState<ModelTableRow[]>([])

  useEffect(() => {
    const qs = new URLSearchParams({ agent_type: agentType, project, from: dateRange.from, to: dateRange.to })
    fetch(`/api/models?${qs}`)
      .then(r => r.json())
      .then((rows: ModelUsage[]) => {
        setModels(
          rows.map(r => ({
            model: r.model,
            agent_type: r.agent_type,
            request_count: r.request_count,
            cost: r.cost,
            avg_cost: r.request_count > 0 ? r.cost / r.request_count : 0,
          }))
        )
      })
      .catch(() => {})
  }, [agentType, project, dateRange])

  const totalCost = models.reduce((s, m) => s + m.cost, 0)
  const pieData = models.slice(0, 8).map((m, i) => ({
    name: m.model,
    value: m.cost,
    color: SERIES_PIE_COLORS[i % SERIES_PIE_COLORS.length],
  }))

  const modelColumns = [
    { key: 'model', label: 'Model', format: (v: unknown) => <span className="font-mono text-xs">{String(v)}</span> },
    {
      key: 'agent_type',
      label: 'Agent',
      format: (v: unknown) => <AgentBadge agent={v as AgentType} />,
    },
    { key: 'request_count', label: 'Reqs', align: 'right' as const, format: (v: unknown) => Number(v).toLocaleString() },
    { key: 'cost', label: 'Cost', align: 'right' as const, format: (v: unknown) => `$${Number(v).toFixed(4)}` },
    { key: 'avg_cost', label: 'Avg/req', align: 'right' as const, format: (v: unknown) => `$${Number(v).toFixed(4)}` },
  ]

  return (
    <div className="space-y-4">
      <ChartCard title="Model Usage">
        <DataTable
          columns={modelColumns}
          data={models as unknown as Record<string, unknown>[]}
          emptyMessage="No model data"
        />
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Cost by Model" height={200} empty={pieData.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  (percent ?? 0) > 0.05 ? `${(name ?? '').slice(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests by Model" height={200} empty={models.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={models.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: CHART_THEME.axis.fontSize, fill: CHART_THEME.axis.fill }} tickLine={false} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 9, fill: CHART_THEME.axis.fill }} tickLine={false} width={90} />
              <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} labelStyle={CHART_THEME.tooltip.labelStyle} itemStyle={CHART_THEME.tooltip.itemStyle} formatter={(v: unknown) => [Number(v).toLocaleString(), 'Requests']} />
              <Bar dataKey="request_count" name="Requests" radius={[0, 4, 4, 0]}>
                {models.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={SERIES_PIE_COLORS[i % SERIES_PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {totalCost > 0 && (
        <div className="text-xs text-muted-foreground text-right px-1">
          Total: ${totalCost.toFixed(4)} across {models.length} model{models.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ─── Efficiency Tab ──────────────────────────────────────────────────────────

type EfficiencyTabProps = {
  project: string
  dateRange: DateRange
}

type EfficiencyAgentRow = {
  agent_type: string
  cache_rate: number
  token_efficiency: number
  avg_duration_s: number
  score: number
}

type EfficiencyTrendPoint = {
  date: string
  [agent: string]: number | string
}

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

const EfficiencyTab = ({ project, dateRange }: EfficiencyTabProps) => {
  const [agentRows, setAgentRows] = useState<EfficiencyAgentRow[]>([])
  const [trend, setTrend] = useState<EfficiencyTrendPoint[]>([])
  const [overall, setOverall] = useState<{ cacheRate: number; avgDuration: number; score: number } | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams({ project, from: dateRange.from, to: dateRange.to })
    fetch(`/api/efficiency?${qs}`)
      .then(r => r.json())
      .then(({ data, comparison }: { data: EfficiencyRow[]; comparison: { current: EfficiencyComparisonRow[]; previous: EfficiencyComparisonRow[] } }) => {
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

// ─── Impact Tab ──────────────────────────────────────────────────────────────

type ImpactTabProps = {
  dateRange: DateRange
}

const SCOPE_OPTIONS = ['all', 'project', 'user'] as const
type ScopeType = typeof SCOPE_OPTIONS[number]

const ImpactTab = ({ dateRange: _dateRange }: ImpactTabProps) => {
  const [scope, setScope] = useState<ScopeType>('all')
  const [configData, setConfigData] = useState<ConfigChange[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    fetch('/api/config-history?days=90')
      .then(r => r.json())
      .then((data: ConfigChange[]) => {
        const isUserScope = (fp: string) =>
          fp.startsWith('~') || fp.startsWith('/Users') || fp.startsWith('/home')

        const filtered = scope === 'all'
          ? data
          : data.filter(c => {
            const isUser = isUserScope(c.file_path)
            return scope === 'user' ? isUser : !isUser
          })
        setConfigData(filtered)
      })
      .catch(() => setConfigData([]))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Scope:</span>
        <div className="flex gap-1">
          {SCOPE_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                scope === s
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading...</div>
      ) : configData.length === 0 ? (
        <EmptyState title="No config changes" description="Config history will appear here after changes are detected." />
      ) : (
        <ConfigTimeline data={configData} />
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [project, setProject] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() })

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <ProjectFilter value={project} onChange={setProject} />
        <div className="ml-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </FilterBar>

      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultValue="cost" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="cost">
            <CostTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="tokens">
            <TokensTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="models">
            <ModelsTab agentType={agentType} project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="efficiency">
            <EfficiencyTab project={project} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="impact">
            <ImpactTab dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
