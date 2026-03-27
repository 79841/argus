import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { registerIpcHandlers } from './infrastructure/ipc/ipc.handler'
import { createWindow, getMainWindow, togglePipWindow, closePipWindow } from './presentation/window'
import { createTray, destroyTray } from './presentation/tray'
import { startNextServer, waitForServer, killNextProcess, DEV_URL } from './infrastructure/server/next-server'

ipcMain.handle('capture-screenshot', async (_event, savePath: string) => {
  const win = getMainWindow()
  if (!win) throw new Error('No window')

  const allowedDirs = [
    app.getPath('userData'),
    app.getPath('pictures'),
    app.getPath('downloads'),
    app.getPath('temp'),
  ]
  const resolved = path.resolve(savePath)
  const isAllowed = allowedDirs.some((dir) => resolved.startsWith(path.resolve(dir) + path.sep) || resolved === path.resolve(dir))
  if (!isAllowed) throw new Error('Save path is not in an allowed directory')

  const image = await win.webContents.capturePage()
  const buffer = image.toPNG()
  fs.writeFileSync(resolved, buffer)
  return resolved
})

ipcMain.handle('select-folder', async (_event, title?: string) => {
  const { dialog } = await import('electron')
  const win = getMainWindow()
  const result = await dialog.showOpenDialog(win!, {
    title: title || 'Select Folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.on('pip-toggle', () => togglePipWindow())
ipcMain.on('pip-close', () => closePipWindow())

ipcMain.on('window-minimize', () => getMainWindow()?.minimize())
ipcMain.on('window-maximize', () => {
  const win = getMainWindow()
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})
ipcMain.on('window-close', () => getMainWindow()?.close())

app.whenReady().then(async () => {
  registerIpcHandlers()
  createTray()
  await startNextServer()

  try {
    await waitForServer(`${DEV_URL}/api/health`)
    createWindow()
  } catch {
    process.stderr.write('Failed to start Next.js server\n')
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const win = getMainWindow()
  if (win === null) {
    createWindow()
  } else {
    win.show()
  }
})

app.on('before-quit', () => {
  destroyTray()
  killNextProcess()
})
