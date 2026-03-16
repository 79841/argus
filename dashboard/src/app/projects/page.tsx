'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { dataClient } from '@/lib/data-client'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/ui/data-table'
import { CHART_THEME } from '@/lib/chart-theme'
import type { ProjectComparisonRow } from '@/lib/queries'
import { formatCost, formatCostDetail, formatCostChart } from '@/lib/format'

const formatDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })
}

const COLORS = [
  'oklch(0.55 0.17 300)',
  'oklch(0.62 0.17 300)',
  'oklch(0.48 0.17 300)',
  'oklch(0.70 0.17 300)',
  'oklch(0.42 0.17 300)',
]

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectComparisonRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    dataClient.query('projects', { view: 'comparison' })
      .then((res) => {
        setProjects(res as ProjectComparisonRow[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalCost = projects.reduce((s, p) => s + p.total_cost, 0)
  const mostActive = projects.reduce<ProjectComparisonRow | null>((best, p) => {
    if (!best) return p
    return p.session_count > best.session_count ? p : best
  }, null)

  const columns = [
    {
      key: 'project_name',
      label: 'Project',
      format: (v: unknown) => (
        <span className="font-medium">{String(v)}</span>
      ),
    },
    {
      key: 'session_count',
      label: 'Sessions',
      align: 'right' as const,
      format: (v: unknown) => Number(v).toLocaleString(),
    },
    {
      key: 'request_count',
      label: 'Requests',
      align: 'right' as const,
      format: (v: unknown) => Number(v).toLocaleString(),
    },
    {
      key: 'total_cost',
      label: 'Total Cost',
      align: 'right' as const,
      format: (v: unknown) => (
        <span className="font-semibold tabular-nums">{formatCostDetail(Number(v))}</span>
      ),
    },
    {
      key: 'top_model',
      label: 'Top Model',
      format: (v: unknown) => (
        <span className="font-mono text-xs text-muted-foreground">
          {String(v || '—').replace(/^claude-/, '').replace(/^models\//, '').replace(/-\d{8}$/, '')}
        </span>
      ),
    },
    {
      key: 'last_activity',
      label: 'Last Active',
      align: 'right' as const,
      format: (v: unknown) => formatDate(String(v)),
    },
  ]

  const chartData = projects.slice(0, 15).map((p) => ({
    name: p.project_name.length > 20 ? p.project_name.slice(0, 18) + '…' : p.project_name,
    fullName: p.project_name,
    cost: p.total_cost,
  }))

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          프로젝트별 비용 및 사용 현황
        </p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Total Projects"
          value={loading ? '—' : projects.length.toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="Total Cost"
          value={loading ? '—' : formatCost(totalCost)}
          loading={loading}
        />
        <KpiCard
          label="Most Active"
          value={loading ? '—' : (mostActive?.project_name ?? '—')}
          sub={mostActive ? `${mostActive.session_count.toLocaleString()} sessions` : undefined}
          loading={loading}
        />
      </div>

      {/* 프로젝트별 비용 비교 바 차트 */}
      <ChartCard
        title="프로젝트별 비용 비교 (Top 15)"
        height={320}
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage="프로젝트 데이터가 없습니다"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatCost(Number(v))}
              {...CHART_THEME.axis}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              {...CHART_THEME.axis}
            />
            <Tooltip
              formatter={(value) => [formatCostChart(Number(value)), 'Cost']}
              labelFormatter={(_label, payload) => {
                if (payload?.[0]) {
                  return (payload[0].payload as { fullName: string }).fullName
                }
                return _label
              }}
              contentStyle={CHART_THEME.tooltip.containerStyle}
              labelStyle={CHART_THEME.tooltip.labelStyle}
              itemStyle={CHART_THEME.tooltip.itemStyle}
            />
            <Bar dataKey="cost" radius={[0, 3, 3, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 프로젝트 목록 테이블 */}
      <ChartCard
        title="프로젝트 목록"
        loading={loading}
        empty={!loading && projects.length === 0}
        emptyMessage="프로젝트 데이터가 없습니다"
      >
        <div
          className="cursor-pointer"
          onClick={(e) => {
            const row = (e.target as HTMLElement).closest('tr[data-row]')
            if (row) {
              const name = row.getAttribute('data-row')
              if (name) router.push(`/projects/${encodeURIComponent(name)}`)
            }
          }}
        >
          <DataTableClickable
            columns={columns}
            data={projects as unknown as Record<string, unknown>[]}
            onRowClick={(row) => {
              router.push(`/projects/${encodeURIComponent(row.project_name as string)}`)
            }}
          />
        </div>
      </ChartCard>
    </div>
  )
}

// 클릭 가능한 DataTable 래퍼
type DataTableClickableProps = {
  columns: Parameters<typeof DataTable>[0]['columns']
  data: Record<string, unknown>[]
  onRowClick: (row: Record<string, unknown>) => void
}

const DataTableClickable = ({ columns, data, onRowClick }: DataTableClickableProps) => {
  if (data.length === 0) {
    return <DataTable columns={columns} data={data} />
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-sunken)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                ].join(' ')}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick(row)}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--fill-hover)] cursor-pointer transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-2 tabular-nums',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  ].join(' ')}
                >
                  {col.format
                    ? col.format(row[col.key], row)
                    : (row[col.key] as string | number | null | undefined) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
