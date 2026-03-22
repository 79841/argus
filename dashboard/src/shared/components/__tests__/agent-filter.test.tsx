import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

import { AgentFilter } from '@/shared/components/agent-filter'

// Helper: Base UI renders tabs as buttons; find by trimmed text content
const findTab = (name: string) => {
  const tabs = screen.getAllByRole('tab')
  return tabs.find((t) => t.textContent?.trim() === name)
}

describe('AgentFilter', () => {
  afterEach(() => {
    cleanup()
  })

  it('4개 탭(버튼)을 렌더링한다', () => {
    render(<AgentFilter value="all" onChange={vi.fn()} />)
    expect(findTab('All Agents')).toBeDefined()
    expect(findTab('Codex')).toBeDefined()
    expect(findTab('Claude Code')).toBeDefined()
    expect(findTab('Gemini CLI')).toBeDefined()
  })

  it('value="claude"일 때 Claude Code 탭이 aria-selected="true"이다', () => {
    render(<AgentFilter value="claude" onChange={vi.fn()} />)
    const tab = findTab('Claude Code')
    expect(tab).toBeDefined()
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('value="claude"일 때 Claude Code 탭에 data-active 속성이 있다', () => {
    render(<AgentFilter value="claude" onChange={vi.fn()} />)
    const tab = findTab('Claude Code')
    expect(tab).toBeDefined()
    expect(tab).toHaveAttribute('data-active')
  })

  it('활성이 아닌 탭은 aria-selected="false"이다', () => {
    render(<AgentFilter value="claude" onChange={vi.fn()} />)
    const tab = findTab('All Agents')
    expect(tab).toBeDefined()
    expect(tab).toHaveAttribute('aria-selected', 'false')
  })

  it('value="all"일 때 All Agents 탭이 활성이다', () => {
    render(<AgentFilter value="all" onChange={vi.fn()} />)
    const tab = findTab('All Agents')
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('value="codex"일 때 Codex 탭이 활성이다', () => {
    render(<AgentFilter value="codex" onChange={vi.fn()} />)
    const tab = findTab('Codex')
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('value="gemini"일 때 Gemini CLI 탭이 활성이다', () => {
    render(<AgentFilter value="gemini" onChange={vi.fn()} />)
    const tab = findTab('Gemini CLI')
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('활성 탭의 tabindex는 0이다', () => {
    render(<AgentFilter value="claude" onChange={vi.fn()} />)
    const tab = findTab('Claude Code')
    expect(tab).toHaveAttribute('tabindex', '0')
  })

  it('비활성 탭의 tabindex는 -1이다', () => {
    render(<AgentFilter value="claude" onChange={vi.fn()} />)
    const tab = findTab('All Agents')
    expect(tab).toHaveAttribute('tabindex', '-1')
  })
})
