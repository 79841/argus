import { ipcMain } from 'electron'
import { handleQuery } from '../../domain/query/query.service'
import { handleMutate } from '../../domain/mutation/mutation.service'
import type { QueryParams } from '../../domain/config/config.types'

export const registerIpcHandlers = (): void => {
  ipcMain.handle('db:query', async (_event, name: string, params?: QueryParams) => {
    try {
      return await handleQuery(name, params)
    } catch (err) {
      throw new Error(`IPC query "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('db:mutate', async (_event, name: string, body?: unknown) => {
    try {
      return await handleMutate(name, body)
    } catch (err) {
      throw new Error(`IPC mutate "${name}" failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
}
