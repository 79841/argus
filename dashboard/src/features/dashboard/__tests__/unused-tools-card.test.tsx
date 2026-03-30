import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { UnusedToolsCard } from '@/shared/components/unused-tools-card'
import type { MergedToolItem, MergedMcpServer } from '@/features/tools/lib/merge-tools'

const makeAgent = (name: string): MergedToolItem => ({
  name,
  status: 'unused',
  scope: 'project',
  agentType: 'claude',
  invocation_count: 0,
  success_count: 0,
  fail_count: 0,
  avg_duration_ms: 0,
})

const makeSkill = (name: string): MergedToolItem => ({
  name,
  status: 'unused',
  scope: 'global',
  agentType: 'claude',
  invocation_count: 0,
  success_count: 0,
  fail_count: 0,
  avg_duration_ms: 0,
})

const makeMcp = (serverName: string): MergedMcpServer => ({
  serverName,
  status: 'unused',
  scope: 'global',
  agentType: 'claude',
  totalCalls: 0,
  successCount: 0,
  failCount: 0,
})

describe('UnusedToolsCard', () => {
  it('미활용 도구가 없으면 렌더링하지 않는다', () => {
    const { container } = render(
      <UnusedToolsCard agents={[]} skills={[]} mcpServers={[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('미활용 에이전트가 있으면 에이전트 섹션을 표시한다', () => {
    render(
      <UnusedToolsCard
        agents={[makeAgent('plan-writer')]}
        skills={[]}
        mcpServers={[]}
      />,
    )
    expect(screen.getByText('미활용 도구')).toBeInTheDocument()
    expect(screen.getByText('에이전트')).toBeInTheDocument()
    expect(screen.getByText('plan-writer')).toBeInTheDocument()
  })

  it('모든 그룹이 있을 때 3개 섹션 모두 표시한다', () => {
    render(
      <UnusedToolsCard
        agents={[makeAgent('page-builder')]}
        skills={[makeSkill('spec')]}
        mcpServers={[makeMcp('filesystem')]}
      />,
    )
    expect(screen.getByText('에이전트')).toBeInTheDocument()
    expect(screen.getByText('스킬')).toBeInTheDocument()
    expect(screen.getByText('MCP 서버')).toBeInTheDocument()
    expect(screen.getByText('3개 미활용')).toBeInTheDocument()
  })

  it('일부 그룹만 있으면 해당 그룹만 표시한다', () => {
    render(
      <UnusedToolsCard
        agents={[]}
        skills={[makeSkill('review')]}
        mcpServers={[makeMcp('github')]}
      />,
    )
    expect(screen.queryByText('에이전트')).not.toBeInTheDocument()
    expect(screen.getByText('스킬')).toBeInTheDocument()
    expect(screen.getByText('MCP 서버')).toBeInTheDocument()
  })

  it('도구 페이지 링크가 렌더링된다', () => {
    render(
      <UnusedToolsCard
        agents={[makeAgent('test-agent')]}
        skills={[]}
        mcpServers={[]}
      />,
    )
    const link = screen.getByText('도구 페이지에서 확인 →')
    expect(link.closest('a')).toHaveAttribute('href', '/tools')
  })
})
