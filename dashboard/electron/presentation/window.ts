import { BrowserWindow, shell } from 'electron'
import path from 'path'
import { DEV_URL } from '../infrastructure/server/next-server'

const isMac = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null
let pipWindow: BrowserWindow | null = null
let _isTrayActive = false

export const getMainWindow = (): BrowserWindow | null => mainWindow
export const getPipWindow = (): BrowserWindow | null => pipWindow

export const setTrayActive = (active: boolean): void => {
  _isTrayActive = active
}

export const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 480,
    title: 'Argus',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    ...(isMac
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 14, y: 18 } }
      : { frame: false }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  })

  mainWindow.loadURL(DEV_URL)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', false)
  })

  mainWindow.on('close', (event) => {
    if (_isTrayActive) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

export const createPipWindow = (): void => {
  if (pipWindow) {
    pipWindow.focus()
    return
  }

  pipWindow = new BrowserWindow({
    width: 420,
    height: 280,
    minWidth: 320,
    minHeight: 200,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  pipWindow.loadURL(`${DEV_URL}/pip`)

  pipWindow.on('closed', () => {
    pipWindow = null
  })
}

export const closePipWindow = (): void => {
  if (pipWindow) {
    pipWindow.close()
    pipWindow = null
  }
}

export const togglePipWindow = (): void => {
  if (pipWindow) {
    closePipWindow()
  } else {
    createPipWindow()
  }
}
