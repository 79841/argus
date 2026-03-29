import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'path'
import { createWindow, getMainWindow, setTrayActive } from './window'

let tray: Tray | null = null

export const getTray = (): Tray | null => tray

export const destroyTray = (): void => {
  tray = null
  setTrayActive(false)
}

const loadTrayIcon = (): Electron.NativeImage => {
  const isMac = process.platform === 'darwin'
  const assetsDir = path.join(__dirname, '..', 'assets')
  if (isMac) {
    const icon = nativeImage.createFromPath(path.join(assetsDir, 'tray-iconTemplate.png'))
    icon.setTemplateImage(true)
    return icon
  }
  return nativeImage.createFromPath(path.join(assetsDir, 'tray-icon.png'))
}

export const createTray = (): void => {
  const icon = loadTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('Argus — AI Agent Monitor')
  setTrayActive(true)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Argus',
      click: () => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        } else {
          createWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        destroyTray()
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    const win = getMainWindow()
    if (win) {
      win.show()
      win.focus()
    } else {
      createWindow()
    }
  })
}
