import fs from 'fs'
import path from 'path'

type HooksStatus = {
  connected: boolean
  hookCount: number
}

type ConnectHooksResult = {
  success: boolean
  action: string
  error?: string
}

const ARGUS_HOOK_MARKER = '/api/hooks'

const makeHookCommand = (endpoint: string): string =>
  `curl -sf -X POST ${endpoint}/api/hooks -H "Content-Type: application/json" -d @- > /dev/null 2>&1 || true`

const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'] as const

type HookEvent = (typeof HOOK_EVENTS)[number]

type HookEntry = {
  matcher?: string
  hooks?: Array<{ type?: string; command?: string }>
}

const AGENT_MATCHERS: Record<HookEvent, string> = {
  PreToolUse: 'Agent',
  PostToolUse: 'Agent',
  Stop: '',
  SubagentStop: '',
}

const hasArgusHook = (entries: HookEntry[]): boolean =>
  entries.some(e => e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER)))

export const connectHooks = (projectPath: string, endpoint = 'http://localhost:9845'): ConnectHooksResult => {
  const settingsPath = path.join(projectPath, '.claude', 'settings.json')
  const settingsDir = path.dirname(settingsPath)

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true })
  }

  let data: Record<string, unknown> = {}
  if (fs.existsSync(settingsPath)) {
    try {
      data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
    } catch {
      data = {}
    }
  }

  const hooks = (data.hooks as Record<HookEvent, HookEntry[]>) ?? ({} as Record<HookEvent, HookEntry[]>)
  const command = makeHookCommand(endpoint)

  for (const event of HOOK_EVENTS) {
    const existing: HookEntry[] = hooks[event] ?? []
    if (!hasArgusHook(existing)) {
      existing.push({ matcher: AGENT_MATCHERS[event], hooks: [{ type: 'command', command }] })
    }
    hooks[event] = existing
  }

  data.hooks = hooks
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  return { success: true, action: 'connected' }
}

export const disconnectHooks = (projectPath: string): ConnectHooksResult => {
  const settingsPath = path.join(projectPath, '.claude', 'settings.json')
  if (!fs.existsSync(settingsPath)) {
    return { success: true, action: 'already_disconnected' }
  }

  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
  } catch {
    return { success: true, action: 'already_disconnected' }
  }

  const hooks = (data.hooks as Record<HookEvent, HookEntry[]>) ?? ({} as Record<HookEvent, HookEntry[]>)

  for (const event of HOOK_EVENTS) {
    const existing: HookEntry[] = hooks[event] ?? []
    const filtered = existing.filter(e => !e.hooks?.some(h => h.command?.includes(ARGUS_HOOK_MARKER)))
    if (filtered.length === 0) {
      delete hooks[event]
    } else {
      hooks[event] = filtered
    }
  }

  data.hooks = hooks
  if (Object.keys(hooks).length === 0) delete data.hooks
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  return { success: true, action: 'disconnected' }
}

export const getHooksStatus = (projectPath: string): HooksStatus => {
  const settingsPath = path.join(projectPath, '.claude', 'settings.json')
  if (!fs.existsSync(settingsPath)) return { connected: false, hookCount: 0 }

  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
    const hooks = (data.hooks as Record<HookEvent, HookEntry[]>) ?? ({} as Record<HookEvent, HookEntry[]>)
    let count = 0
    for (const event of HOOK_EVENTS) {
      const entries: HookEntry[] = hooks[event] ?? []
      if (hasArgusHook(entries)) count++
    }
    return { connected: count === HOOK_EVENTS.length, hookCount: count }
  } catch {
    return { connected: false, hookCount: 0 }
  }
}

export type { HooksStatus, ConnectHooksResult }
