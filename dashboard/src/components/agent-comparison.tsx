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
import { getAgentColor } from '@/lib/agents'

type AgentComparisonData = {
  agent_type: string
  cost: number
  requests: number
}

type AgentComparisonProps = {
  data: AgentComparisonData[]
}

const AGENT_LABELS: Record<string, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini',
}

const formatCost = (value: unknown) => `$${Number(value).toFixed(2)}`

export const AgentComparison = ({ data }: AgentComparisonProps) => {
  const chartData = data.map((row) => ({
    ...row,
    name: AGENT_LABELS[row.agent_type] ?? row.agent_type,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agent Cost Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tickFormatter={formatCost} fontSize={12} />
              <YAxis type="category" dataKey="name" width={100} fontSize={12} />
              <Tooltip
                formatter={(value, _name, entry) => [
                  formatCost(value),
                  `${entry.payload.requests} requests`,
                ]}
              />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={getAgentColor(entry.agent_type)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
