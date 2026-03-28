import { contextBridge, ipcRenderer, webFrame } from 'electron'

webFrame.insertCSS(`
  html, body, .electron-transparent {
    background: transparent !important;
  }
  :root {
    --glass-bg: oklch(1 0 0 / 50%);
    --glass-bg-heavy: oklch(1 0 0 / 65%);
    --glass-bg-light: oklch(1 0 0 / 30%);
  }
  :root.dark {
    --glass-bg: oklch(0.14 0.01 270 / 35%);
    --glass-bg-heavy: oklch(0.16 0.01 270 / 50%);
    --glass-bg-light: oklch(0.12 0.01 270 / 20%);
  }
`)

contextBridge.exposeInMainWorld('electronAPI', {
  query: (name: string, params?: Record<string, unknown>) =>
    ipcRenderer.invoke('db:query', name, params),
  mutate: (name: string, body?: unknown) =>
    ipcRenderer.invoke('db:mutate', name, body),
  captureScreenshot: (savePath: string) =>
    ipcRenderer.invoke('capture-screenshot', savePath),
  selectFolder: (title?: string) =>
    ipcRenderer.invoke('select-folder', title),
  windowControl: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },
  pip: {
    toggle: () => ipcRenderer.send('pip-toggle'),
    close: () => ipcRenderer.send('pip-close'),
  },
  showNotification: (title: string, body: string) =>
    ipcRenderer.send('show-notification', title, body),
  platform: process.platform,
  onFullScreenChange: (callback: (isFullScreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullScreen: boolean) => callback(isFullScreen)
    ipcRenderer.on('fullscreen-change', handler)
    return () => { ipcRenderer.removeListener('fullscreen-change', handler) }
  },
})
