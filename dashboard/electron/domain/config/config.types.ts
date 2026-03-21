export type QueryParams = Record<string, unknown>

export type RegistryRow = { project_name: string; project_path: string }

export type ConfigFileEntry = {
  agent: string
  path: string
}

export type ProjectFileEntry = {
  path: string
  agent: string
  scope: 'project'
  exists: boolean
  projectRoot: string
  projectName: string
}

export type UserFileEntry = {
  path: string
  agent: string
  scope: 'user'
  exists: boolean
}
