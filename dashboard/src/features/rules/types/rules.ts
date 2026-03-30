export type Scope = 'project' | 'user'
export type Agent = 'claude' | 'codex' | 'gemini'

export type FileEntry = {
  path: string
  agent: Agent
  scope: Scope
  exists: boolean
  projectRoot: string
  projectName: string
}

export type RegistryEntry = {
  project_name: string
  project_path: string
}

export type DbProject = {
  project_name: string
  loaded: boolean
  project_path: string
}

export type ProjectGroup = {
  projectName: string
  projectRoot: string
  loaded: boolean
  agents: { agent: Agent; files: FileEntry[] }[]
}
