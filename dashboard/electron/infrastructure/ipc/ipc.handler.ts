import { ipcMain } from 'electron'
import { handleQuery } from '../../domain/query/query.service'
import { handleMutate } from '../../domain/mutation/mutation.service'
import { isDev, PORT } from '../server/next-server'
import type { QueryParams } from '../../domain/config/config.types'

const buildUrl = (name: string, params?: QueryParams): string => {
  const base = `http://localhost:${PORT}/api/${name}`
  if (!params) return base
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)] as [string, string])
  ).toString()
  return qs ? `${base}?${qs}` : base
}

const proxyQuery = async (name: string, params?: QueryParams): Promise<unknown> => {
  const res = await fetch(buildUrl(name, params))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const proxyMutate = async (name: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`http://localhost:${PORT}/api/${name}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const proxyDelete = async (name: string, params?: QueryParams): Promise<unknown> => {
  const res = await fetch(buildUrl(name, params), { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const registerIpcHandlers = (): void => {
  ipcMain.handle('db:query', async (_event, name: string, params?: QueryParams) => {
    try {
      if (isDev) return await proxyQuery(name, params)
      return await handleQuery(name, params)
    } catch (err) {
      throw new Error(`IPC query "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('db:mutate', async (_event, name: string, body?: unknown) => {
    try {
      if (isDev) return await proxyMutate(name, body)
      return await handleMutate(name, body)
    } catch (err) {
      throw new Error(`IPC mutate "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('db:delete', async (_event, name: string, params?: QueryParams) => {
    try {
      return await proxyDelete(name, params)
    } catch (err) {
      throw new Error(`IPC delete "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
}
