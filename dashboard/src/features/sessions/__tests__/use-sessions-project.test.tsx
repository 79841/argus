import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/services', () => ({
  sessionsService: {
    getSessions: vi.fn().mockResolvedValue([]),
    getSessionDetail: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/shared/lib/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, locale: 'ko', setLocale: vi.fn() }),
}))

import { useSessions } from '../hooks/use-sessions'
import { sessionsService } from '@/shared/services'

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sessionsService.getSessions).mockResolvedValue([])
  })

  it('options 없이 호출하면 project 기본값이 "all"이다', async () => {
    const { result } = renderHook(() => useSessions())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.project).toBe('all')
  })

  it('initialProject 옵션이 있으면 project가 해당 값으로 고정된다', async () => {
    const { result } = renderHook(() => useSessions({ initialProject: 'argus' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.project).toBe('argus')
  })

  it('initialProject가 있으면 API 호출 시 해당 프로젝트로 필터링된다', async () => {
    renderHook(() => useSessions({ initialProject: 'my-project' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(sessionsService.getSessions).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'my-project' })
    )
  })

  it('options 없이 호출하면 API 호출 시 project가 "all"이다', async () => {
    renderHook(() => useSessions())

    await act(async () => {
      await Promise.resolve()
    })

    expect(sessionsService.getSessions).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'all' })
    )
  })
})
