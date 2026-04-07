import type { AgentProject } from '@/shared/lib/queries'
import { SessionGroup } from './session-group'

type ProjectRoomProps = {
  project: AgentProject
}

export const ProjectRoom = ({ project }: ProjectRoomProps) => {
  return (
    <div className="mb-8">
      <div className="mb-2 px-1 text-sm font-medium text-muted-foreground">
        {project.project_name}
      </div>
      <div className="space-y-3">
        {project.sessions.map((session) => (
          <SessionGroup key={session.session_id} session={session} />
        ))}
      </div>
    </div>
  )
}
