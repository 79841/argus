import type { QueryParams } from '@/shared/types/electron'

const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.electronAPI !== undefined

let ipcDisabled = false

const buildUrl = (name: string, params?: QueryParams): string => {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]) as [string, string][]
      ).toString()
    : ''
  return `/api/${name}${qs ? `?${qs}` : ''}`
}

const fetchHttp = async (name: string, params?: QueryParams): Promise<unknown> => {
  const res = await fetch(buildUrl(name, params))
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

const deleteHttp = async (name: string, params?: QueryParams): Promise<unknown> => {
  const res = await fetch(buildUrl(name, params), { method: 'DELETE' })
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

  async delete(name: string, params?: QueryParams): Promise<unknown> {
    if (isElectron() && !ipcDisabled) {
      try {
        return await window.electronAPI!.delete?.(name, params)
      } catch {
        ipcDisabled = true
      }
    }
    return deleteHttp(name, params)
  },
}
