import { dataClient } from '@/shared/lib/data-client'
import type { QueryParams } from '@/shared/types/electron'
import type { ProjectRow, ProjectComparisonRow } from '@/shared/lib/queries'
import type { RegistryEntry } from '@/features/rules/types/rules'

type ProjectDetailResponse = {
  stats: unknown
  daily: unknown[]
}

type ProjectRegistryResponse = {
  projects?: RegistryEntry[]
}

type ProjectsWithCostsResponse = Array<{
  project_name: string
  total_cost: number
}>

export const projectsService = {
  getProjects: (params?: QueryParams): Promise<ProjectRow[] | ProjectComparisonRow[] | ProjectsWithCostsResponse> =>
    dataClient.query('projects', params) as Promise<ProjectRow[] | ProjectComparisonRow[] | ProjectsWithCostsResponse>,

  getProjectDetail: (name: string): Promise<ProjectDetailResponse> =>
    dataClient.query(`projects/${encodeURIComponent(name)}`) as Promise<ProjectDetailResponse>,

  getProjectRegistry: (): Promise<ProjectRegistryResponse> =>
    dataClient.query('projects/registry') as Promise<ProjectRegistryResponse>,

  addProject: (body: unknown): Promise<unknown> =>
    dataClient.mutate('projects/registry', body),

  deleteProject: (name: string): Promise<unknown> =>
    dataClient.delete('projects/registry', { name }),
}
