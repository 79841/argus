import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Nav } from '@/shared/components/nav'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.sessions': 'Sessions',
        'nav.usage': 'Usage',
        'nav.tools': 'Tools',
        'nav.projects': 'Projects',
        'nav.rules': 'Rules',
        'nav.insights': 'Insights',
        'nav.settings': 'Settings',
      }
      return map[key] ?? key
    },
    locale: 'ko',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render: renderProp }: { children?: React.ReactNode; render?: React.ReactElement }) => (
    <div>{renderProp ?? children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
}))

import { usePathname } from 'next/navigation'
const mockUsePathname = vi.mocked(usePathname)

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Nav', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockUsePathname.mockReturnValue('/')
  })

  it('기본적으로 collapsed 상태로 렌더링된다', () => {
    render(<Nav />)
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('w-14')
  })

  it('루트 경로에서 Dashboard 링크가 활성 스타일을 가진다', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const dashboardLink = links.find((l) => l.getAttribute('href') === '/')
    expect(dashboardLink).toHaveClass('bg-primary')
  })

  it('/sessions 경로에서 Sessions 링크가 활성 스타일을 가진다', () => {
    mockUsePathname.mockReturnValue('/sessions')
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const sessionsLink = links.find((l) => l.getAttribute('href') === '/sessions')
    expect(sessionsLink).toHaveClass('bg-primary')
  })

  it('Settings 링크를 렌더링한다', () => {
    render(<Nav />)
    const settingsLink = screen.getAllByRole('link').find((l) => l.getAttribute('href') === '/settings')
    expect(settingsLink).toBeInTheDocument()
  })

  it('localStorage에서 collapsed 상태를 복원한다', async () => {
    localStorageMock.setItem('argus-nav-collapsed', 'false')

    await act(async () => {
      render(<Nav />)
    })

    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('w-48')
  })

  it('argus-nav-toggle 이벤트로 collapse 상태를 변경한다', async () => {
    render(<Nav />)

    await act(async () => {
      window.dispatchEvent(new CustomEvent('argus-nav-toggle', { detail: false }))
    })

    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('w-48')
  })

  it('nav 아이템 링크들이 렌더링된다', () => {
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/sessions')
    expect(hrefs).toContain('/tools')
    expect(hrefs).toContain('/settings')
  })
})
