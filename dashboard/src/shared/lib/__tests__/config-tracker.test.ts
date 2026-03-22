import { describe, it, expect, vi, afterEach } from 'vitest'

// child_process mock은 모듈 import 전에 설정해야 한다
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execFileSync } from 'child_process'
import { getConfigHistory } from '@/shared/lib/config-tracker'

const mockExecFileSync = vi.mocked(execFileSync)

afterEach(() => {
  vi.restoreAllMocks()
})

const VALID_HASH = 'a'.repeat(40)
const VALID_HASH_2 = 'b'.repeat(40)

describe('getConfigHistory — git log 파싱', () => {
  it('git log 출력을 파싱하여 ConfigChange[] 반환', async () => {
    const date = '2026-03-20T10:00:00+00:00'
    const message = 'Update CLAUDE.md settings'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        return `${VALID_HASH}|${date}|${message}`
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    expect(result.length).toBeGreaterThan(0)
    const change = result[0]
    expect(change.commit_hash).toBe(VALID_HASH)
    expect(change.date).toBe(date)
    expect(change.commit_message).toBe(message)
  })

  it('git diff 출력이 있으면 diff 필드에 포함', async () => {
    const date = '2026-03-20T10:00:00+00:00'
    const diffContent = '--- a/CLAUDE.md\n+++ b/CLAUDE.md\n@@ -1,1 +1,2 @@\n+new line'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        return `${VALID_HASH}|${date}|feat: update`
      }
      if (argsArr[0] === 'diff') {
        return diffContent
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].diff).toBe(diffContent)
  })

  it('빈 git log → 빈 배열 반환', async () => {
    mockExecFileSync.mockReturnValue('')

    const result = await getConfigHistory('/repo')

    expect(result).toEqual([])
  })

  it('git 실행 오류 → 에러 없이 빈 배열 반환', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('git not found')
    })

    const result = await getConfigHistory('/repo')

    expect(result).toEqual([])
  })

  it('날짜별 내림차순 정렬', async () => {
    const oldDate = '2026-03-10T10:00:00+00:00'
    const newDate = '2026-03-20T10:00:00+00:00'

    // CLAUDE.md 파일에 두 커밋, mcp.json에 한 커밋을 돌려주도록 설정
    let callCount = 0
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        callCount++
        if (callCount === 1) {
          return `${VALID_HASH}|${newDate}|feat: new\n${VALID_HASH_2}|${oldDate}|feat: old`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    expect(result.length).toBeGreaterThanOrEqual(2)
    const dates = result.map(c => new Date(c.date).getTime())
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1])
    }
  })

  it('detectAgentType — claude 파일 → agent_type=claude', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        // CLAUDE.md 파일만 결과 반환 (첫 번째 호출)
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'CLAUDE.md') {
          return `${VALID_HASH}|${date}|update claude settings`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const claudeChanges = result.filter(c => c.file_path === 'CLAUDE.md')
    expect(claudeChanges.length).toBeGreaterThan(0)
    expect(claudeChanges[0].agent_type).toBe('claude')
  })

  it('detectAgentType — .mcp.json → agent_type=claude', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === '.mcp.json') {
          return `${VALID_HASH}|${date}|update mcp`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const mcpChanges = result.filter(c => c.file_path === '.mcp.json')
    expect(mcpChanges.length).toBeGreaterThan(0)
    expect(mcpChanges[0].agent_type).toBe('claude')
  })

  it('detectAgentType — codex.md → agent_type=codex', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'codex.md') {
          return `${VALID_HASH}|${date}|update codex config`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const codexChanges = result.filter(c => c.file_path === 'codex.md')
    expect(codexChanges.length).toBeGreaterThan(0)
    expect(codexChanges[0].agent_type).toBe('codex')
  })

  it('detectAgentType — AGENTS.md → agent_type=codex', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'AGENTS.md') {
          return `${VALID_HASH}|${date}|update agents`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const agentsChanges = result.filter(c => c.file_path === 'AGENTS.md')
    expect(agentsChanges.length).toBeGreaterThan(0)
    expect(agentsChanges[0].agent_type).toBe('codex')
  })

  it('detectAgentType — GEMINI.md → agent_type=gemini', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'GEMINI.md') {
          return `${VALID_HASH}|${date}|update gemini config`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const geminiChanges = result.filter(c => c.file_path === 'GEMINI.md')
    expect(geminiChanges.length).toBeGreaterThan(0)
    expect(geminiChanges[0].agent_type).toBe('gemini')
  })

  it('diff 길이 2000자 초과 시 잘림', async () => {
    const date = '2026-03-20T10:00:00+00:00'
    const longDiff = 'x'.repeat(3000)

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'CLAUDE.md') {
          return `${VALID_HASH}|${date}|big change`
        }
        return ''
      }
      if (argsArr[0] === 'diff') {
        return longDiff
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const claudeChanges = result.filter(c => c.file_path === 'CLAUDE.md')
    expect(claudeChanges.length).toBeGreaterThan(0)
    expect(claudeChanges[0].diff.length).toBeLessThanOrEqual(2000)
  })

  it('유효하지 않은 hash는 무시', async () => {
    const date = '2026-03-20T10:00:00+00:00'

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[]
      if (argsArr[0] === 'log') {
        const filePath = argsArr[argsArr.length - 1]
        if (filePath === 'CLAUDE.md') {
          // 유효하지 않은 hash (40자 hex가 아님)
          return `invalid-hash|${date}|bad commit`
        }
        return ''
      }
      return ''
    })

    const result = await getConfigHistory('/repo')

    const claudeChanges = result.filter(c => c.file_path === 'CLAUDE.md')
    expect(claudeChanges).toEqual([])
  })
})
