export const formatCost = (v: number): string => `$${v.toFixed(2)}`

export const formatCostDetail = (v: number): string => {
  if (v >= 1) return `$${v.toFixed(2)}`
  if (v >= 0.01) return `$${v.toFixed(3)}`
  return `$${v.toFixed(4)}`
}

export const formatCostChart = (v: number): string => `$${v.toFixed(4)}`

export const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export const formatDuration = (ms: number): string => {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

export const shortenModel = (model: string): string =>
  model
    .replace(/^claude-/, '')
    .replace(/^models\//, '')
    .replace(/-\d{8}$/, '')

export const parseModels = (model: string): string[] => {
  if (!model) return ['unknown']
  return model.split(',').map((m) => m.trim()).filter(Boolean)
}

export const formatTime = (ts: string): string => {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * ISO timestamp를 "Xs ago", "Xm ago", "Xh ago", "Xd ago" 형태로 변환한다.
 * sessions 페이지처럼 i18n key를 받는 오버로드도 지원한다.
 */
export const formatRelativeTime = (iso: string, tFn?: (key: string) => string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)

  if (tFn) {
    if (diff < 60) return `${diff}${tFn('sessions.reltime.sec')}`
    if (diff < 3600) return `${Math.floor(diff / 60)}${tFn('sessions.reltime.min')}`
    if (diff < 86400) return `${Math.floor(diff / 3600)}${tFn('sessions.reltime.hour')}`
    return `${Math.floor(diff / 86400)}${tFn('sessions.reltime.day')}`
  }

  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
