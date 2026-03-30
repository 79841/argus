import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ name: 'my-project' })),
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/shared/components/agent-filter', () => ({
  AgentFilter: () => <div data-testid="agent-filter" />,
}))

vi.mock('@/features/rules', () => ({
  useConfigFiles: vi.fn(() => ({
    loading: false,
    selectedFile: null,
    fileContent: '',
    contentLoading: false,
    projectGroups: [
      {
        projectName: 'my-project',
        projectRoot: '/path/to/my-project',
        loaded: true,
        agents: [],
      },
      {
        projectName: 'other-project',
        projectRoot: '/path/to/other',
        loaded: true,
        agents: [],
      },
    ],
    userAgents: [],
    loadFile: vi.fn(),
  })),
  FileTree: ({ projectGroups }: { projectGroups: Array<{ projectName: string }> }) => (
    <div data-testid="file-tree">
      {projectGroups.map((g) => (
        <div key={g.projectName} data-testid={`project-group-${g.projectName}`} />
      ))}
    </div>
  ),
  FileViewer: () => <div data-testid="file-viewer" />,
}))

import ProjectRulesPage from '../rules/page'
import { useConfigFiles } from '@/features/rules'

describe('ProjectRulesPage', () => {
  it('에이전트 필터를 렌더링한다', () => {
    render(<ProjectRulesPage />)
    expect(screen.getByTestId('agent-filter')).toBeInTheDocument()
  })

  it('FileTree와 FileViewer를 렌더링한다', () => {
    render(<ProjectRulesPage />)
    expect(screen.getByTestId('file-tree')).toBeInTheDocument()
    expect(screen.getByTestId('file-viewer')).toBeInTheDocument()
  })

  it('해당 프로젝트의 그룹만 FileTree에 전달한다', () => {
    render(<ProjectRulesPage />)
    expect(screen.getByTestId('project-group-my-project')).toBeInTheDocument()
    expect(screen.queryByTestId('project-group-other-project')).not.toBeInTheDocument()
  })

  it('useConfigFiles를 호출한다', () => {
    render(<ProjectRulesPage />)
    expect(useConfigFiles).toHaveBeenCalled()
  })

  it('global userAgents가 표시되지 않는다', () => {
    render(<ProjectRulesPage />)
    expect(screen.queryByTestId('project-group-other-project')).not.toBeInTheDocument()
  })
})
