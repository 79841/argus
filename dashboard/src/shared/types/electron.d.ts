type QueryParams = Record<string, string | number | boolean | undefined>

type WindowControl = {
  minimize: () => void
  maximize: () => void
  close: () => void
}

type PipControl = {
  toggle: () => void
  close: () => void
}

type ElectronAPI = {
  query: (name: string, params?: QueryParams) => Promise<unknown>
  mutate: (name: string, body?: unknown) => Promise<unknown>
  delete?: (name: string, params?: QueryParams) => Promise<unknown>
  selectFolder?: (title?: string) => Promise<string | null>
  windowControl?: WindowControl
  pip?: PipControl
  showNotification?: (title: string, body: string) => void
  platform?: string
  onFullScreenChange?: (callback: (isFullScreen: boolean) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export type { ElectronAPI, QueryParams }
