import type { QueryParams } from '@/shared/types/electron'

const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.electronAPI !== undefined

let ipcDisabled = false

const fetchHttp = async (name: string, params?: QueryParams): Promise<unknown> => {
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
}

const mutateHttp = async (name: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const dataClient = {
  async query(name: string, params?: QueryParams): Promise<unknown> {
    if (isElectron() && !ipcDisabled) {
      try {
        return await window.electronAPI!.query(name, params)
      } catch {
        ipcDisabled = true
      }
    }
    return fetchHttp(name, params)
  },

  async mutate(name: string, body?: unknown): Promise<unknown> {
    if (isElectron() && !ipcDisabled) {
      try {
        return await window.electronAPI!.mutate(name, body)
      } catch {
        ipcDisabled = true
      }
    }
    return mutateHttp(name, body)
  },
}
