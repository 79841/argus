import type { QueryParams } from '@/types/electron'

const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.electronAPI !== undefined

export const dataClient = {
  async query(name: string, params?: QueryParams): Promise<unknown> {
    if (isElectron()) {
      return window.electronAPI!.query(name, params)
    }
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]) as [string, string][]
        ).toString()
      : ''
    const url = `/api/${name}${qs ? `?${qs}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  async mutate(name: string, body?: unknown): Promise<unknown> {
    if (isElectron()) {
      return window.electronAPI!.mutate(name, body)
    }
    const res = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
}
