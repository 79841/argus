import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ProjectSubNav } from '@/features/projects/components/project-sub-nav'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

const { usePathname } = await import('next/navigation')
const mockUsePathname = vi.mocked(usePathname)

describe('ProjectSubNav', () => {
  it('5개 탭을 렌더링한다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project')
    render(<ProjectSubNav projectName="my-project" />)

    expect(screen.getByText('projects.tab.overview')).toBeInTheDocument()
    expect(screen.getByText('projects.tab.sessions')).toBeInTheDocument()
    expect(screen.getByText('projects.tab.usage')).toBeInTheDocument()
    expect(screen.getByText('projects.tab.tools')).toBeInTheDocument()
    expect(screen.getByText('projects.tab.rules')).toBeInTheDocument()
  })

  it('개요 탭은 /projects/[name] 경로일 때 활성이다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project')
    render(<ProjectSubNav projectName="my-project" />)

    const overviewLink = screen.getByText('projects.tab.overview').closest('a')
    expect(overviewLink).toHaveClass('border-b-2', 'border-primary')
  })

  it('세션 탭은 /projects/[name]/sessions 경로일 때 활성이다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project/sessions')
    render(<ProjectSubNav projectName="my-project" />)

    const sessionsLink = screen.getByText('projects.tab.sessions').closest('a')
    expect(sessionsLink).toHaveClass('border-b-2', 'border-primary')
  })

  it('개요 탭은 서브 경로(/sessions 등)에서 비활성이다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project/sessions')
    render(<ProjectSubNav projectName="my-project" />)

    const overviewLink = screen.getByText('projects.tab.overview').closest('a')
    expect(overviewLink).not.toHaveClass('border-b-2')
  })

  it('각 탭의 href가 올바르게 설정된다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project')
    render(<ProjectSubNav projectName="my-project" />)

    expect(screen.getByText('projects.tab.overview').closest('a')).toHaveAttribute(
      'href',
      '/projects/my-project'
    )
    expect(screen.getByText('projects.tab.sessions').closest('a')).toHaveAttribute(
      'href',
      '/projects/my-project/sessions'
    )
    expect(screen.getByText('projects.tab.usage').closest('a')).toHaveAttribute(
      'href',
      '/projects/my-project/usage'
    )
    expect(screen.getByText('projects.tab.tools').closest('a')).toHaveAttribute(
      'href',
      '/projects/my-project/tools'
    )
    expect(screen.getByText('projects.tab.rules').closest('a')).toHaveAttribute(
      'href',
      '/projects/my-project/rules'
    )
  })

  it('프로젝트 이름에 특수문자가 있을 때 인코딩된 href를 사용한다', () => {
    mockUsePathname.mockReturnValue('/projects/my%20project')
    render(<ProjectSubNav projectName="my project" />)

    expect(screen.getByText('projects.tab.overview').closest('a')).toHaveAttribute(
      'href',
      '/projects/my%20project'
    )
  })

  it('도구 탭 하위 경로에서도 도구 탭이 활성이다', () => {
    mockUsePathname.mockReturnValue('/projects/my-project/tools/bash')
    render(<ProjectSubNav projectName="my-project" />)

    const toolsLink = screen.getByText('projects.tab.tools').closest('a')
    expect(toolsLink).toHaveClass('border-b-2', 'border-primary')
  })
})
