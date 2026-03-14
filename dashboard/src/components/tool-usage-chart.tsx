'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ToolUsageRow } from '@/lib/queries'

type ToolUsageChartProps = {
  data: ToolUsageRow[]
}

const COLORS = [
  '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
]

export const ToolUsageChart = ({ data }: ToolUsageChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No tool usage data
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.slice(0, 15).map((row) => ({
    name: row.tool_name,
    count: row.invocation_count,
    success: row.success_count,
    fail: row.fail_count,
    avgMs: Math.round(row.avg_duration_ms),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
              <XAxis type="number" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                width={120}
                tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 16)}...` : v}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as typeof chartData[number]
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.count} calls ({d.success} ok, {d.fail} fail)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        avg {d.avgMs}ms
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
