import { Tray, Menu, nativeImage, app } from 'electron'
import { createWindow, getMainWindow, setTrayActive } from './window'

let tray: Tray | null = null

export const getTray = (): Tray | null => tray

export const destroyTray = (): void => {
  tray = null
  setTrayActive(false)
}

export const createTray = (): void => {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAEFJREFUOI1jYBgFgwkwMjAw/Gdg+M9IjGYmBgaG/0SazcjAwMBAjAuYiNSMHIBcwERNFzAxMDCgmE2sC0bBYAAAG7wFAVwvZIoAAAAASUVORK5CYII='
  )

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
