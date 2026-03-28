import { contextBridge, ipcRenderer, webFrame } from 'electron'

webFrame.insertCSS(`
  html, body, .electron-transparent {
    background: transparent !important;
  }
  :root {
    --glass-bg: oklch(1 0 0 / 60%);
    --glass-bg-heavy: oklch(1 0 0 / 75%);
    --glass-bg-light: oklch(1 0 0 / 45%);
    --glass-shadow: 0 4px 24px oklch(0 0 0 / 12%), 0 1px 2px oklch(0 0 0 / 8%);
    --glass-shadow-lg: 0 8px 40px oklch(0 0 0 / 16%), 0 2px 4px oklch(0 0 0 / 10%);
  }
  :root.dark {
    --glass-bg: oklch(0.14 0.01 270 / 40%);
    --glass-bg-heavy: oklch(0.16 0.01 270 / 55%);
    --glass-bg-light: oklch(0.12 0.01 270 / 25%);
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
