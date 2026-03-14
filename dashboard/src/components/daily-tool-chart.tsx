'use client'

import {
  Treemap,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyToolRow } from '@/lib/queries'

type DailyToolChartProps = {
  data: DailyToolRow[]
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

type TreemapItem = {
  name: string
  size: number
  fill: string
}

const CustomContent = (props: {
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

type TooltipPayloadItem = {
  payload: TreemapItem & { root?: { children?: TreemapItem[] } }
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  const total = item.root?.children?.reduce((sum: number, c: TreemapItem) => sum + c.size, 0) || 1
  const percent = ((item.size / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-sm text-muted-foreground">
        {item.size.toLocaleString()} calls ({percent}%)
      </p>
    </div>
  )
}

export const DailyToolChart = ({ data }: DailyToolChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data
          </div>
        </CardContent>
      </Card>
    )
  }

  const toolCounts = data.reduce<Record<string, number>>((acc, r) => {
    acc[r.tool_name] = (acc[r.tool_name] || 0) + r.count
    return acc
  }, {})

  let defaultIdx = 0
  const getColor = (name: string) => {
    if (TOOL_COLORS[name]) return TOOL_COLORS[name]
    if (name.startsWith('mcp')) return '#eab308'
    return DEFAULT_COLORS[defaultIdx++ % DEFAULT_COLORS.length]
  }

  const treemapData = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      size: count,
      fill: getColor(name),
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              content={<CustomContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
