'use client'

import { Treemap, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartCard } from '@/shared/components/ui/chart-card'
import { CHART_THEME } from '@/shared/lib/chart-theme'
import { useLocale } from '@/shared/lib/i18n'
import type { ToolDetailRow } from '@/shared/lib/queries'
import { CATEGORY_COLORS, DEFAULT_COLORS } from './constants'

type TreemapItem = {
  name: string
  size: number
  fill: string
}

type TreemapTooltipItem = {
  payload: TreemapItem & { root?: { children?: TreemapItem[] } }
}

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

export const CategoryTreemap = ({ data }: { data: ToolDetailRow[] }) => {
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
