import type { AgentType } from './agents'

export const CHART_THEME = {
  grid: {
    strokeDasharray: '3 3',
    stroke: 'var(--border-subtle)',
    strokeOpacity: 0.6,
  },

  axis: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    fill: 'var(--text-tertiary)',
    tickLine: false,
    axisLine: { stroke: 'var(--border-default)' },
  },

  tooltip: {
    containerStyle: {
      backgroundColor: 'var(--bg-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px oklch(0 0 0 / 10%)',
      padding: '8px 12px',
    },
    labelStyle: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      marginBottom: 4,
    },
    itemStyle: {
      fontSize: 13,
      color: 'var(--text-primary)',
    },
  },

  legend: {
    fontSize: 11,
    iconType: 'circle' as const,
    iconSize: 8,
  },
} as const

export const AGENT_CHART_COLORS: Record<AgentType, string> = {
  all: 'oklch(0.62 0.17 300)',
  claude: 'var(--agent-claude)',
  codex: 'var(--agent-codex)',
  gemini: 'var(--agent-gemini)',
}

export const SERIES_COLORS = [
  'oklch(0.55 0 0)',
  'oklch(0.65 0 0)',
  'oklch(0.45 0 0)',
  'oklch(0.75 0 0)',
  'oklch(0.35 0 0)',
  'oklch(0.60 0 0)',
  'oklch(0.70 0 0)',
  'oklch(0.40 0 0)',
] as const

export const TOKEN_COLORS = {
  input: 'oklch(0.55 0.12 280)',
  output: 'oklch(0.65 0.15 350)',
  cache_read: 'oklch(0.65 0.18 150)',
} as const
