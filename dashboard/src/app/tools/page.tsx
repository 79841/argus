'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Treemap,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ToolDetailRow, DailyToolRow, IndividualToolRow } from '@/lib/queries'
import { ToolDetailTable } from '@/components/tool-detail-table'
import { IndividualToolTable } from '@/components/individual-tool-table'
import { useTopBar } from '@/components/top-bar-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getToolCategory } from '@/lib/ingest-utils'

const CATEGORY_COLORS: Record<string, string> = {
  'File Read': '#3b82f6',
  'File Write': '#22c55e',
  'File Edit': '#06b6d4',
  'Shell': '#f97316',
  'Search': '#a855f7',
  'Orchestration': '#ec4899',
  'MCP': '#f59e0b',
  'Other': '#6b7280',
}

const CATEGORY_TAILWIND: Record<string, { text: string; bg: string }> = {
  'File Read': { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  'File Write': { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  'File Edit': { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  'Shell': { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  'Search': { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  'Orchestration': { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/40' },
  'MCP': { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  'Other': { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/40' },
}

type TreemapItem = {
  name: string
  size: number
  fill: string
  category: string
}

type CategorySummary = {
  name: string
  totalCalls: number
  successRate: number
  toolCount: number
  color: string
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const TreemapContent = (props: {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  size?: number
  fill?: string
  root?: { children?: TreemapItem[] }
}) => {
  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '#6b7280', root } = props
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
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>
        {size.toLocaleString()} ({percent}%)
      </text>
    </g>
  )
}

type TooltipPayloadItem = {
  payload: TreemapItem & { root?: { children?: TreemapItem[] } }
}

const TreemapTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  const total = item.root?.children?.reduce((sum: number, c: TreemapItem) => sum + c.size, 0) || 1
  const percent = ((item.size / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground">{item.category}</p>
      <p className="text-sm text-muted-foreground">
        {item.size.toLocaleString()} calls ({percent}%)
      </p>
    </div>
  )
}

export default function ToolsPage() {
  const { agentType, project } = useTopBar()
  const [tools, setTools] = useState<ToolDetailRow[]>([])
  const [daily, setDaily] = useState<DailyToolRow[]>([])
  const [individual, setIndividual] = useState<IndividualToolRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = `agent_type=${agentType}&project=${project}&days=30&detail=true`
    fetch(`/api/tools?${q}`)
      .then((r) => r.json())
      .then((data) => {
        setTools(data.tools ?? [])
        setDaily(data.daily ?? [])
        setIndividual(data.individual ?? [])
        setLoading(false)
      })
      .catch(() => {
        setTools([])
        setDaily([])
        setIndividual([])
        setLoading(false)
      })
  }, [agentType, project])

  const treemapData = useMemo<TreemapItem[]>(() => {
    const toolCounts = daily.reduce<Record<string, number>>((acc, r) => {
      acc[r.tool_name] = (acc[r.tool_name] || 0) + r.count
      return acc
    }, {})

    return Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const category = getToolCategory(name)
        return {
          name,
          size: count,
          fill: CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Other'],
          category,
        }
      })
  }, [daily])

  const categorySummaries = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, { calls: number; success: number; count: number }>()

    for (const row of tools) {
      const category = getToolCategory(row.tool_name)
      const existing = map.get(category) ?? { calls: 0, success: 0, count: 0 }
      existing.calls += row.invocation_count
      existing.success += row.success_count
      existing.count += 1
      map.set(category, existing)
    }

    const order = ['File Read', 'File Write', 'File Edit', 'Shell', 'Search', 'Orchestration', 'MCP', 'Other']
    return order
      .filter((name) => map.has(name))
      .map((name) => {
        const data = map.get(name)!
        return {
          name,
          totalCalls: data.calls,
          successRate: data.calls > 0 ? data.success / data.calls : 0,
          toolCount: data.count,
          color: CATEGORY_COLORS[name] ?? CATEGORY_COLORS['Other'],
        }
      })
  }, [tools])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No tool usage data
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      {/* Row 1: Treemap + Category Summary (35%) */}
      <div className="flex min-h-0 gap-4" style={{ flex: '35 0 0' }}>
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool Invocation Treemap</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-3">
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  content={<TreemapContent />}
                >
                  <RechartsTooltip content={<TreemapTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto">
          {categorySummaries.map((cat) => {
            const tw = CATEGORY_TAILWIND[cat.name] ?? CATEGORY_TAILWIND['Other']
            return (
              <Card key={cat.name} className="shrink-0">
                <CardContent className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className={`text-xs font-medium ${tw.text}`}>{cat.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {cat.toolCount} tools
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold tabular-nums">
                      {cat.totalCalls.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatPercent(cat.successRate)} success
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Row 2: Tool Detail Table (35%) */}
      <div className="min-h-0 overflow-y-auto" style={{ flex: '35 0 0' }}>
        <ToolDetailTable data={tools} />
      </div>

      {/* Row 3: Orchestration Detail (30%) */}
      <div className="min-h-0 overflow-y-auto" style={{ flex: '30 0 0' }}>
        <IndividualToolTable data={individual} />
      </div>
    </div>
  )
}
