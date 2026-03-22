import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle } from '@/shared/components/theme-toggle'

const mockSetTheme = vi.fn()
let mockTheme = 'system'

vi.mock('@/shared/components/theme-provider', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme = 'system'
  })

  it('system 모드에서 "System" 텍스트와 Monitor 아이콘을 표시한다', () => {
    render(<ThemeToggle />)
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('light 모드에서 "Light" 텍스트와 Sun 아이콘을 표시한다', () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    expect(screen.getByText('Light')).toBeInTheDocument()
  })

  it('dark 모드에서 "Dark" 텍스트와 Moon 아이콘을 표시한다', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('system에서 클릭하면 light로 전환한다', () => {
    mockTheme = 'system'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('light에서 클릭하면 dark로 전환한다', () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('dark에서 클릭하면 system으로 전환한다', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('버튼의 title 속성에 현재 테마를 표시한다', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Theme: dark')
  })
})
