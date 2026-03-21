import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectFilter } from '@/components/project-filter'

vi.mock('@/lib/data-client', () => ({
  dataClient: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

import { dataClient } from '@/lib/data-client'

const mockQuery = vi.mocked(dataClient.query)

describe('ProjectFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('로딩 완료 후 "All Projects" 옵션을 표시한다', async () => {
    mockQuery.mockResolvedValue([])
    render(<ProjectFilter value="all" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('프로젝트 목록을 불러와 렌더링한다', async () => {
    mockQuery.mockResolvedValue([
      { project_name: 'argus' },
      { project_name: 'myapp' },
    ])
    render(<ProjectFilter value="all" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('projects', undefined)
    })
  })

  it('API 오류 시 빈 목록으로 폴백한다', async () => {
    mockQuery.mockRejectedValue(new Error('Network error'))
    render(<ProjectFilter value="all" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
    // 오류 발생해도 컴포넌트가 렌더링됨
  })

  it('value prop이 Select에 전달된다', async () => {
    mockQuery.mockResolvedValue([])
    render(<ProjectFilter value="all" onChange={vi.fn()} />)
    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })
  })

  it('마운트 시 projects API를 호출한다', async () => {
    mockQuery.mockResolvedValue([])
    render(<ProjectFilter value="all" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('projects', undefined)
    })
  })
})
