'use client'

import { useState } from 'react'
import type { ToolDetailRow, DailyToolRow, ToolUsageRow } from '@/lib/queries'
import { ToolDetailTable } from '@/components/tool-detail-table'
import { IndividualToolTable } from '@/components/individual-tool-table'
import { RegisteredToolsCard } from '@/components/registered-tools-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { FilterBar } from '@/components/filter-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentFilter } from '@/components/agent-filter'
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
import { CHART_THEME } from '@/lib/chart-theme'
import { useLocale } from '@/lib/i18n'
import type { AgentType } from '@/lib/agents'
import { formatDuration } from '@/lib/format'
import { useToolsData } from '@/features/tools'

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_OPTIONS = [
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

const formatNumber = (n: number): string => n.toLocaleString()

const formatPercent = (n: number): string => `${(n * 100).toFixed(1)}%`

// ─── Types ────────────────────────────────────────────────────────────────────

type TreemapItem = {
  name: string
  size: number
  fill: string
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

  return (
    <ChartCard
      title={t('tools.chart.topTools')}
      height={360}
      empty={chartData.length === 0}
    >
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
              horizontal={false}
            />
            <XAxis type="number" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={CHART_THEME.axis.fontSize}
              width={130}
              tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 18)}...` : v)}
            />
            <Tooltip
              contentStyle={CHART_THEME.tooltip.containerStyle}
              labelStyle={CHART_THEME.tooltip.labelStyle}
              itemStyle={CHART_THEME.tooltip.itemStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as typeof chartData[number]
                return (
                  <div style={CHART_THEME.tooltip.containerStyle}>
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
    </ChartCard>
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

  const nameFontSize = Math.min(13, Math.max(9, Math.floor(width / 10)))
  const subFontSize = Math.min(11, Math.max(8, nameFontSize - 2))
  const charsPerPx = 0.6 / nameFontSize
  const maxChars = Math.floor(width * charsPerPx * (width - 8))
  const displayName = name.length > maxChars && maxChars > 3
    ? name.slice(0, maxChars - 1) + '…'
    : name
  const showSub = height >= 50 && width >= 60

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--background)" strokeWidth={2} rx={4} />
      <text
        x={x + width / 2}
        y={showSub ? y + height / 2 - 6 : y + height / 2 + nameFontSize / 3}
        textAnchor="middle"
        fill="#fff"
        fontSize={nameFontSize}
        fontWeight={600}
      >
        {displayName}
      </text>
      {showSub && (
        <text x={x + width / 2} y={y + height / 2 + subFontSize + 2} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={subFontSize}>
          {size.toLocaleString()} ({percent}%)
        </text>
      )}
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
    <div style={CHART_THEME.tooltip.containerStyle}>
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

  return (
    <ChartCard
      title={t('tools.chart.categoryDist')}
      height={280}
      empty={treemapData.length === 0}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} content={<CategoryTreemapContent />}>
            <Tooltip content={<CategoryTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </ChartCard>
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
    .map((tool) => ({ name: tool, total: data.filter((r) => r.tool_name === tool).reduce((s, r) => s + r.count, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((tool) => tool.name)

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => {
      const row: Record<string, string | number> = { date: date.slice(5) }
      for (const tool of topTools) row[tool] = counts[tool] ?? 0
      return row
    })

  let colorIdx = 0
  const getColor = (name: string) => {
    if (TOOL_COLORS[name]) return TOOL_COLORS[name]
    if (name.startsWith('mcp')) return '#eab308'
    return DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length]
  }

  return (
    <ChartCard
      title={t('tools.chart.dailyTrend')}
      height={280}
      empty={chartData.length === 0}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
            />
            <XAxis dataKey="date" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis fontSize={CHART_THEME.axis.fontSize} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} />
            <Legend wrapperStyle={{ fontSize: `${CHART_THEME.legend.fontSize}px` }} />
            {topTools.map((tool) => (
              <Area key={tool} type="monotone" dataKey={tool} stackId="1" stroke={getColor(tool)} fill={getColor(tool)} fillOpacity={0.4} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// ─── Daily Total Trend ────────────────────────────────────────────────────────

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

  return (
    <ChartCard
      title={t('tools.chart.dailyTotal')}
      height={240}
      empty={chartData.length === 0}
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid
              strokeDasharray={CHART_THEME.grid.strokeDasharray}
              stroke={CHART_THEME.grid.stroke}
              strokeOpacity={CHART_THEME.grid.strokeOpacity}
            />
            <XAxis dataKey="date" fontSize={CHART_THEME.axis.fontSize} />
            <YAxis fontSize={CHART_THEME.axis.fontSize} />
            <Tooltip contentStyle={CHART_THEME.tooltip.containerStyle} />
            <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('tools.chart.totalCalls')} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const { t } = useLocale()
  const [agentType, setAgentType] = useState<AgentType>('all')
  const [days, setDays] = useState('7')

  const { tools, topTools, daily, individual, kpi, loading } = useToolsData(agentType, days)

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <AgentFilter value={agentType} onChange={setAgentType} />
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
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
      </FilterBar>

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t('tools.kpi.totalCalls')}
              value={kpi ? formatNumber(kpi.total_calls) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.successRate')}
              value={kpi ? formatPercent(kpi.success_rate) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.avgDuration')}
              value={kpi ? formatDuration(kpi.avg_duration_ms) : '—'}
              loading={loading}
            />
            <KpiCard
              label={t('tools.kpi.uniqueTools')}
              value={kpi ? formatNumber(kpi.unique_tools) : '—'}
              loading={loading}
            />
          </div>

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
              ) : tools.length === 0 ? (
                <EmptyState title={t('tools.empty') ?? 'No tool data'} />
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
      </div>
    </div>
  )
}
