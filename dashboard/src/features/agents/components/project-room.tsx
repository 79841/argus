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
      <div className="rounded-2xl bg-muted/30 px-5 py-2">
        {project.sessions.map((session, i) => (
          <div
            key={session.session_id}
            className={i > 0 ? 'border-t border-[var(--border-subtle)]' : ''}
          >
            <SessionGroup session={session} />
          </div>
        ))}
      </div>
    </div>
  )
}
