type QueryParams = Record<string, string | number | boolean | undefined>

type ElectronAPI = {
  query: (name: string, params?: QueryParams) => Promise<unknown>
  mutate: (name: string, body?: unknown) => Promise<unknown>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export type { ElectronAPI, QueryParams }
