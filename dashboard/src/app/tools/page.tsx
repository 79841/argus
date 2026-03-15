'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ToolDetailRow, DailyToolRow, IndividualToolRow, ToolUsageRow } from '@/lib/queries'
import { ToolDetailTable } from '@/components/tool-detail-table'
import { IndividualToolTable } from '@/components/individual-tool-table'
import { RegisteredToolsCard } from '@/components/registered-tools-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  Treemap,
} from 'recharts'
import { useLocale } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolsKpi = {
  total_calls: number
  success_rate: number
  avg_duration_ms: number
  unique_tools: number
}

type TreemapItem = {
  name: string
  size: number
  fill: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'claude', label: 'Claude' },
  { value: 'codex', label: 'Codex' },
  { value: 'gemini', label: 'Gemini' },
]

const DATE_OPTION_KEYS = [
  { value: '7', labelKey: 'tools.date.7' },
  { value: '14', labelKey: 'tools.date.14' },
  { value: '30', labelKey: 'tools.date.30' },
  { value: '90', labelKey: 'tools.date.90' },
]

const TOP_COLORS = [
  '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
  '#a855f7', '#06b6d4', '#84cc16', '#f43f5e', '#0ea5e9',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Built-in': '#3b82f6',
  'Orchestration': '#8b5cf6',
  'MCP': '#f59e0b',
}

const TOOL_COLORS: Record<string, string> = {
  Read: '#3b82f6',
  Edit: '#10b981',
  Write: '#14b8a6',
  Bash: '#f97316',
  Grep: '#6366f1',
  Glob: '#8b5cf6',
  Agent: '#ef4444',
  Skill: '#ec4899',
  shell: '#f97316',
  exec_command: '#f97316',
  read_file: '#3b82f6',
  write_file: '#14b8a6',
  patch_file: '#10b981',
  list_directory: '#8b5cf6',
  edit_file: '#10b981',
  web_search: '#eab308',
}

const DEFAULT_COLORS = ['#64748b', '#94a3b8', '#78716c', '#a8a29e', '#71717a']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDuration = (ms: number): string => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

const formatNumber = (n: number): string => n.toLocaleString()

const formatPercent = (n: number): string => `${(n * 100).toFixed(1)}%`

// ─── KPI Cards ────────────────────────────────────────────────────────────────

const KpiCards = ({ kpi, loading }: { kpi: ToolsKpi | null; loading: boolean }) => {
  const { t } = useLocale()
  const items = [
    { label: t('tools.kpi.totalCalls'), value: kpi ? formatNumber(kpi.total_calls) : '—' },
    { label: t('tools.kpi.successRate'), value: kpi ? formatPercent(kpi.success_rate) : '—' },
    { label: t('tools.kpi.avgDuration'), value: kpi ? formatDuration(kpi.avg_duration_ms) : '—' },
    { label: t('tools.kpi.uniqueTools'), value: kpi ? formatNumber(kpi.unique_tools) : '—' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">
              {loading ? <span className="text-muted-foreground text-lg">...</span> : value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Top Tools Bar Chart ──────────────────────────────────────────────────────

const TopToolsChart = ({ data }: { data: ToolUsageRow[] }) => {
  const { t } = useLocale()
  const chartData = data.slice(0, 15).map((r) => ({
    name: r.tool_name,
    count: r.invocation_count,
    success: r.success_count,
    fail: r.fail_count,
    avgMs: Math.round(r.avg_duration_ms),
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.chart.topTools')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            No data
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('tools.chart.topTools')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
              <XAxis type="number" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                width={130}
                tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 18)}...` : v)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as typeof chartData[number]
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="font-medium text-sm">{d.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(d.count)} calls ({d.success} ok, {d.fail} fail)
                      </p>
                      <p className="text-sm text-muted-foreground">avg {d.avgMs}ms</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={entry.name} fill={TOP_COLORS[i % TOP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Category Treemap ─────────────────────────────────────────────────────────

const CategoryTreemapContent = (props: {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  size?: number
  fill?: string
  root?: { children?: TreemapItem[] }
}) => {
  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '#64748b', root } = props
  const total = root?.children?.reduce((sum: number, c: TreemapItem) => sum + c.size, 0) || 1
  const percent = ((size / total) * 100).toFixed(0)

  if (width < 40 || height < 30) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--background)" strokeWidth={2} rx={4} />
      </g>
    )
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--background)" strokeWidth={2} rx={4} />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={11}>
        {size.toLocaleString()} ({percent}%)
      </text>
    </g>
  )
}

type TreemapTooltipItem = {
  payload: TreemapItem & { root?: { children?: TreemapItem[] } }
}

const CategoryTooltip = ({ active, payload }: { active?: boolean; payload?: TreemapTooltipItem[] }) => {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  const total = item.root?.children?.reduce((sum: number, c: TreemapItem) => sum + c.size, 0) || 1
  const percent = ((item.size / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-sm text-muted-foreground">{item.size.toLocaleString()} calls ({percent}%)</p>
    </div>
  )
}

const CategoryTreemap = ({ data }: { data: ToolDetailRow[] }) => {
  const { t } = useLocale()
  const categoryCounts: Record<string, number> = {}
  for (const r of data) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + r.invocation_count
  }

  let defaultIdx = 0
  const treemapData = Object.entries(categoryCounts).map(([name, size]) => ({
    name,
    size,
    fill: CATEGORY_COLORS[name] ?? DEFAULT_COLORS[defaultIdx++ % DEFAULT_COLORS.length],
  }))

  if (treemapData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.chart.categoryDist')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">No data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('tools.chart.categoryDist')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} content={<CategoryTreemapContent />}>
              <Tooltip content={<CategoryTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Daily Stacked Area Chart ─────────────────────────────────────────────────

const DailyTrendChart = ({ data }: { data: DailyToolRow[] }) => {
  const { t } = useLocale()
  const toolSet = new Set<string>()
  const byDate: Record<string, Record<string, number>> = {}

  for (const r of data) {
    toolSet.add(r.tool_name)
    if (!byDate[r.date]) byDate[r.date] = {}
    byDate[r.date][r.tool_name] = r.count
  }

  const topTools = [...toolSet]
    .map((t) => ({ name: t, total: data.filter((r) => r.tool_name === t).reduce((s, r) => s + r.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((t) => t.name)

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => {
      const row: Record<string, string | number> = { date: date.slice(5) }
      for (const t of topTools) row[t] = counts[t] ?? 0
      return row
    })

  let colorIdx = 0
  const getColor = (name: string) => {
    if (TOOL_COLORS[name]) return TOOL_COLORS[name]
    if (name.startsWith('mcp')) return '#eab308'
    return DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length]
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.chart.dailyTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">No data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('tools.chart.dailyTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {topTools.map((t) => (
                <Area key={t} type="monotone" dataKey={t} stackId="1" stroke={getColor(t)} fill={getColor(t)} fillOpacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Fail Rate Trend ──────────────────────────────────────────────────────────

const FailRateTrendChart = ({ data }: { data: DailyToolRow[] }) => {
  const { t } = useLocale()
  const byDate: Record<string, { count: number }> = {}

  for (const r of data) {
    if (!byDate[r.date]) byDate[r.date] = { count: 0 }
    byDate[r.date].count += r.count
  }

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { count }]) => ({
      date: date.slice(5),
      total: count,
    }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('tools.chart.dailyTotal')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-muted-foreground text-sm">No data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('tools.chart.dailyTotal')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('tools.chart.totalCalls')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

type FilterBarProps = {
  agentType: string
  days: string
  onAgentChange: (v: string) => void
  onDaysChange: (v: string) => void
}

const FilterBar = ({ agentType, days, onAgentChange, onDaysChange }: FilterBarProps) => {
  const { t } = useLocale()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-md border bg-background p-1">
        {AGENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAgentChange(opt.value)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              agentType === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-md border bg-background p-1">
        {DATE_OPTION_KEYS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onDaysChange(opt.value)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              days === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const { t } = useLocale()
  const [agentType, setAgentType] = useState('all')
  const [days, setDays] = useState('7')

  const [tools, setTools] = useState<ToolDetailRow[]>([])
  const [topTools, setTopTools] = useState<ToolUsageRow[]>([])
  const [daily, setDaily] = useState<DailyToolRow[]>([])
  const [individual, setIndividual] = useState<IndividualToolRow[]>([])
  const [kpi, setKpi] = useState<ToolsKpi | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&days=${days}&detail=true`
    const simpleQ = `agent_type=${agentType}&days=${days}`

    Promise.all([
      fetch(`/api/tools?${q}`).then((r) => r.json()),
      fetch(`/api/tools?${simpleQ}`).then((r) => r.json()),
    ])
      .then(([detail, simple]) => {
        const detailTools: ToolDetailRow[] = detail.tools ?? []
        const dailyData: DailyToolRow[] = detail.daily ?? []
        const individualData: IndividualToolRow[] = detail.individual ?? []
        const simpleTools: ToolUsageRow[] = simple.tools ?? []

        setTools(detailTools)
        setDaily(dailyData)
        setIndividual(individualData)
        setTopTools(simpleTools)

        const totalCalls = simpleTools.reduce((s, r) => s + r.invocation_count, 0)
        const totalSuccess = simpleTools.reduce((s, r) => s + r.success_count, 0)
        const avgDuration =
          simpleTools.length > 0
            ? simpleTools.reduce((s, r) => s + r.avg_duration_ms * r.invocation_count, 0) /
              Math.max(totalCalls, 1)
            : 0
        setKpi({
          total_calls: totalCalls,
          success_rate: totalCalls > 0 ? totalSuccess / totalCalls : 0,
          avg_duration_ms: avgDuration,
          unique_tools: simpleTools.length,
        })
        setLoading(false)
      })
      .catch(() => {
        setTools([])
        setDaily([])
        setIndividual([])
        setTopTools([])
        setKpi(null)
        setLoading(false)
      })
  }, [agentType, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('tools.subtitle')}</p>
      </div>

      <FilterBar
        agentType={agentType}
        days={days}
        onAgentChange={setAgentType}
        onDaysChange={setDays}
      />

      <KpiCards kpi={kpi} loading={loading} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TopToolsChart data={topTools} />
              <CategoryTreemap data={tools} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <>
              <ToolDetailTable data={tools} />
              <IndividualToolTable data={individual} />
              <RegisteredToolsCard />
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <>
              <DailyTrendChart data={daily} />
              <FailRateTrendChart data={daily} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
