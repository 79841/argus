// Storage Keys
export const STORAGE_KEYS = {
  NAV_COLLAPSED: 'argus-nav-collapsed',
  AUTO_REFRESH: 'argus-auto-refresh',
  LOCALE: 'argus-locale',
  AGENT_THEME: 'argus-agent-theme',
  REFRESH_INTERVAL: 'argus-refresh-interval',
  THEME: 'argus-theme',
  ONBOARDING_COMPLETED: 'argus-onboarding-completed',
} as const

// Polling intervals (ms)
export const POLLING = {
  ACTIVE_SESSION_MS: 30_000,
  VERIFICATION_MS: 3_000,
  REFRESH_OPTIONS: [
    { label: '30s', value: 30_000 },
    { label: '1m', value: 60_000 },
    { label: '5m', value: 300_000 },
    { label: 'Off', value: 0 },
  ],
} as const

// Default values
export const DEFAULTS = {
  DAYS: 7,
  DAILY_DAYS: 30,
  DASHBOARD_HEATMAP_DAYS: 112,
  SESSION_LIMIT: 100,
  DASHBOARD_RECENT_SESSIONS: 5,
  PROJECT_CHART_SLICE: 8,
  INSIGHTS_LIMIT: 10,
  CONFIG_HISTORY_DAYS: 90,
} as const

// Date range presets
export const DATE_RANGE_PRESETS = {
  WEEK: 7,
  TWO_WEEKS: 14,
  MONTH: 30,
  QUARTER: 90,
} as const

// API limits
export const API_LIMITS = {
  MAX_DAYS: 365,
  MAX_LIMIT: 10_000,
} as const

// Agent types (without 'all')
export const AGENT_TYPES = ['claude', 'codex', 'gemini'] as const
