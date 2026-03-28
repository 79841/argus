'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useHeartbeat } from '../hooks/use-heartbeat'
import { useLocale } from '@/shared/lib/i18n'
import { AGENTS } from '@/shared/lib/agents'
import { formatTokens } from '@/shared/lib/format'

const GLOW_FILTER_ID = 'pip-glow'

const DARK_THEME = {
  grid: { stroke: '#1f2937', strokeDasharray: '3 3' },
  axis: { fill: '#6b7280', fontSize: 11 },
  tooltip: {
    backgroundColor: '#030712',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '8px 12px',
  },
} as const

type Props = {
  minutes?: number
}

export const HeartbeatChart = ({ minutes = 5 }: Props) => {
  const { data, isLoading } = useHeartbeat(minutes)
  const { t } = useLocale()

  const hasActivity = data.some(
    (d) => d.claude > 0 || d.codex > 0 || d.gemini > 0
  )

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-950 rounded-lg p-4">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500 text-sm animate-pulse">
            {t('common.loading')}
          </span>
        </div>
      ) : !hasActivity ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-600 text-sm">{t('pip.heartbeat.noData')}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <filter id={GLOW_FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray={DARK_THEME.grid.strokeDasharray}
              stroke={DARK_THEME.grid.stroke}
            />
            <XAxis
              dataKey="minute"
              tick={{ fontSize: DARK_THEME.axis.fontSize, fill: DARK_THEME.axis.fill }}
              tickLine={false}
              axisLine={{ stroke: DARK_THEME.grid.stroke }}
            />
            <YAxis
              tick={{ fontSize: DARK_THEME.axis.fontSize, fill: DARK_THEME.axis.fill }}
              tickLine={false}
              axisLine={{ stroke: DARK_THEME.grid.stroke }}
              tickFormatter={(v: number) => formatTokens(v)}
              width={55}
            />
            <Tooltip
              contentStyle={DARK_THEME.tooltip}
              labelStyle={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}
              itemStyle={{ fontSize: 13, color: '#f3f4f6' }}
              formatter={(v: unknown) => [formatTokens(Number(v)), '']}
            />
            <Legend
              fontSize={11}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ color: '#6b7280' }}
            />
            {(['claude', 'codex', 'gemini'] as const).map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={AGENTS[id].name}
                stroke={AGENTS[id].hex}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                filter={`url(#${GLOW_FILTER_ID})`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
