export const TOP_COLORS = [
  '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
  '#a855f7', '#06b6d4', '#84cc16', '#f43f5e', '#0ea5e9',
]

export const CATEGORY_COLORS: Record<string, string> = {
  'Built-in': '#3b82f6',
  'Orchestration': '#8b5cf6',
  'MCP': '#f59e0b',
}

export const TOOL_COLORS: Record<string, string> = {
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

export const DEFAULT_COLORS = ['#64748b', '#94a3b8', '#78716c', '#a8a29e', '#71717a']

export const STATUS_BADGE = {
  active: { i18nKey: 'tools.detail.statusActive', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  unused: { i18nKey: 'tools.detail.statusUnused', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  unregistered: { i18nKey: 'tools.detail.statusUnregistered', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
} as const

export const SCOPE_BADGE = {
  project: { label: 'project', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  global: { label: 'global', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
} as const

export const formatToolDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
