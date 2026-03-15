import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  query: (name: string, params?: Record<string, unknown>) =>
    ipcRenderer.invoke('db:query', name, params),
  mutate: (name: string, body?: unknown) =>
    ipcRenderer.invoke('db:mutate', name, body),
})
