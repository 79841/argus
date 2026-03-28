import { contextBridge, ipcRenderer, webFrame } from 'electron'

webFrame.executeJavaScript(`document.documentElement.dataset.electron = ''`)

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
