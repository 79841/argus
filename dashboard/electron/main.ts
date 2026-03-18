import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, exec, type ChildProcess } from 'child_process'
import net from 'net'
import { registerIpcHandlers } from './ipc-handlers'

const PORT = 3000
const DEV_URL = `http://localhost:${PORT}`

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let nextProcess: ChildProcess | null = null

const isDev = !app.isPackaged

const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port)
  })
}

const waitForServer = (url: string, timeout = 30000): Promise<void> => {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then((res) => {
          if (res.ok) resolve()
          else if (Date.now() - start > timeout) reject(new Error('Server timeout'))
          else setTimeout(check, 500)
        })
        .catch(() => {
          if (Date.now() - start > timeout) reject(new Error('Server timeout'))
          else setTimeout(check, 500)
        })
    }
    check()
  })
}

const startNextServer = async (): Promise<void> => {
  const inUse = await isPortInUse(PORT)
  if (inUse) return

  const cwd = isDev ? process.cwd() : path.join(process.resourcesPath, 'app')
  const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next')
  const cmd = isDev ? 'npm' : process.execPath
  const args = isDev
    ? ['run', 'dev', '--', '--port', String(PORT)]
    : [nextBin, 'start', '--port', String(PORT)]

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
  }

  if (!isDev) {
    env.ELECTRON_RUN_AS_NODE = '1'
    env.ARGUS_DB_PATH = path.join(app.getPath('userData'), 'argus.db')
  }

  nextProcess = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    env: env as NodeJS.ProcessEnv,
    shell: process.platform === 'win32',
  })

  nextProcess.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[next] ${data.toString()}`)
  })

  nextProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[next] ${data.toString()}`)
  })

  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`Next.js exited with code ${code}\n`)
    }
    nextProcess = null
  })
}

const isMac = process.platform === 'darwin'

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Argus',
    ...(isMac
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 16 } }
      : { autoHideMenuBar: true }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadURL(DEV_URL)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const createTray = (): void => {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAEFJREFUOI1jYBgFgwkwMjAw/Gdg+M9IjGYmBgaG/0SazcjAwMBAjAuYiNSMHIBcwERNFzAxMDCgmE2sC0bBYAAAG7wFAVwvZIoAAAAASUVORK5CYII='
  )

  tray = new Tray(icon)
  tray.setToolTip('Argus — AI Agent Monitor')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Argus',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        tray = null
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

ipcMain.handle('capture-screenshot', async (_event, savePath: string) => {
  if (!mainWindow) throw new Error('No window')
  const image = await mainWindow.webContents.capturePage()
  const buffer = image.toPNG()
  fs.writeFileSync(savePath, buffer)
  return savePath
})

ipcMain.handle('select-folder', async (_event, title?: string) => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: title || 'Select Folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

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
  if (mainWindow === null) {
    createWindow()
  } else {
    mainWindow.show()
  }
})

const killNextProcess = (): void => {
  if (!nextProcess) return
  if (process.platform === 'win32' && nextProcess.pid) {
    exec(`taskkill /pid ${nextProcess.pid} /T /F`)
  } else {
    nextProcess.kill()
  }
  nextProcess = null
}

app.on('before-quit', () => {
  tray = null
  killNextProcess()
})
