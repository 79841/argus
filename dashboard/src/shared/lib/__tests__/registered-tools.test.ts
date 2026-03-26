import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'

let testDb: Database.Database

vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../db')>()
  return {
    ...original,
    getDb: () => testDb,
  }
})

vi.mock('os', async (importOriginal) => {
  const original = await importOriginal<typeof import('os')>()
  return {
    ...original,
    default: {
      ...original,
      homedir: () => '/mock-home',
    },
  }
})

const mockFs: Record<string, string | string[]> = {}

vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>()
  return {
    ...original,
    default: {
      ...original,
      readdirSync: (dirPath: string) => {
        const entries = mockFs[dirPath]
        if (Array.isArray(entries)) return entries
        throw new Error(`ENOENT: ${dirPath}`)
      },
      existsSync: (filePath: string) => filePath in mockFs,
      readFileSync: (filePath: string) => {
        const content = mockFs[filePath]
        if (typeof content === 'string') return content
        throw new Error(`ENOENT: ${filePath}`)
      },
    },
  }
})

const { scanRegisteredTools } = await import('../registered-tools')

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
  Object.keys(mockFs).forEach((k) => delete mockFs[k])
})

describe('scanRegisteredTools', () => {
  it('프로젝트 등록이 없으면 글로벌 스캔만 수행', () => {
    const result = scanRegisteredTools()
    expect(result).toEqual([])
  })

  it('등록된 프로젝트의 .claude/agents 스캔', () => {
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('argus', '/projects/argus')

    mockFs['/projects/argus/.claude/agents'] = ['data-seeder.md', 'plan-writer.md']

    const result = scanRegisteredTools()
    const agents = result.filter((t) => t.type === 'agent')

    expect(agents).toHaveLength(2)
    expect(agents[0]).toMatchObject({
      name: 'data-seeder',
      type: 'agent',
      scope: 'project',
      agentType: 'claude',
      projectName: 'argus',
    })
    expect(agents[1].name).toBe('plan-writer')
  })

  it('등록된 프로젝트의 .codex/skills 스캔', () => {
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('test-pro', '/projects/test-pro')

    mockFs['/projects/test-pro/.codex/skills'] = ['my-skill']
    mockFs['/projects/test-pro/.codex/skills/my-skill/SKILL.md'] = '# Skill'

    const result = scanRegisteredTools()
    const skills = result.filter((t) => t.type === 'skill' && t.agentType === 'codex')

    expect(skills).toHaveLength(1)
    expect(skills[0]).toMatchObject({
      name: 'my-skill',
      type: 'skill',
      scope: 'project',
      agentType: 'codex',
      projectName: 'test-pro',
    })
  })

  it('~/.claude.json에서 연결된 프로젝트의 MCP 서버 스캔', () => {
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('argus', '/projects/argus')

    mockFs['/mock-home/.claude.json'] = JSON.stringify({
      projects: {
        '/projects/argus': {
          mcpServers: {
            'linear-server': { type: 'stdio', command: 'npx' },
          },
        },
        '/projects/unregistered': {
          mcpServers: {
            'other-server': { type: 'stdio', command: 'npx' },
          },
        },
      },
    })

    const result = scanRegisteredTools()
    const mcps = result.filter((t) => t.type === 'mcp')

    const linearServer = mcps.find((t) => t.name === 'linear-server')
    expect(linearServer).toMatchObject({
      name: 'linear-server',
      type: 'mcp',
      scope: 'project',
      agentType: 'claude',
      projectName: 'argus',
    })

    const otherServer = mcps.find((t) => t.name === 'other-server')
    expect(otherServer).toBeUndefined()
  })

  it('연결되지 않은 프로젝트의 MCP는 무시', () => {
    mockFs['/mock-home/.claude.json'] = JSON.stringify({
      projects: {
        '/projects/unregistered': {
          mcpServers: { 'some-server': {} },
        },
      },
    })

    const result = scanRegisteredTools()
    const mcps = result.filter((t) => t.type === 'mcp')
    expect(mcps).toHaveLength(0)
  })

  it('동일 name+type+scope+agentType 중복 제거', () => {
    // 2개의 프로젝트에 동일한 이름의 에이전트가 있을 때 중복 제거 확인
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('proj-a', '/projects/a')
    testDb.prepare('INSERT INTO project_registry (project_name, project_path) VALUES (?, ?)').run('proj-b', '/projects/b')

    mockFs['/projects/a/.claude/agents'] = ['shared-agent.md']
    mockFs['/projects/b/.claude/agents'] = ['shared-agent.md']

    const result = scanRegisteredTools()
    const agents = result.filter((t) => t.name === 'shared-agent' && t.type === 'agent' && t.agentType === 'claude')
    // projectName이 다르면 dedupe 키가 같으므로 1개만 남음
    expect(agents).toHaveLength(1)
  })

  it('~/.gemini/settings.json에서 글로벌 MCP 서버 스캔', () => {
    mockFs['/mock-home/.gemini/settings.json'] = JSON.stringify({
      mcpServers: {
        'gemini-mcp-server': { command: 'npx', args: ['-y', 'some-server'] },
        'another-server': { command: 'node', args: ['server.js'] },
      },
    })

    const result = scanRegisteredTools()
    const geminiMcps = result.filter((t) => t.type === 'mcp' && t.agentType === 'gemini')

    expect(geminiMcps).toHaveLength(2)
    expect(geminiMcps.find((t) => t.name === 'gemini-mcp-server')).toMatchObject({
      name: 'gemini-mcp-server',
      type: 'mcp',
      scope: 'global',
      agentType: 'gemini',
    })
    expect(geminiMcps.find((t) => t.name === 'another-server')).toMatchObject({
      name: 'another-server',
      type: 'mcp',
      scope: 'global',
      agentType: 'gemini',
    })
  })

  it('~/.gemini/settings.json에 mcpServers가 없으면 MCP를 반환하지 않는다', () => {
    mockFs['/mock-home/.gemini/settings.json'] = JSON.stringify({
      theme: 'dark',
    })

    const result = scanRegisteredTools()
    const geminiMcps = result.filter((t) => t.type === 'mcp' && t.agentType === 'gemini')
    expect(geminiMcps).toHaveLength(0)
  })

  it('~/.gemini/settings.json이 없으면 MCP를 반환하지 않는다', () => {
    const result = scanRegisteredTools()
    const geminiMcps = result.filter((t) => t.type === 'mcp' && t.agentType === 'gemini')
    expect(geminiMcps).toHaveLength(0)
  })

  it('claude, codex, gemini MCP를 모두 동시에 스캔한다', () => {
    mockFs['/mock-home/.claude/.mcp.json'] = JSON.stringify({
      mcpServers: { 'claude-server': {} },
    })
    mockFs['/mock-home/.codex/.mcp.json'] = JSON.stringify({
      mcpServers: { 'codex-server': {} },
    })
    mockFs['/mock-home/.gemini/settings.json'] = JSON.stringify({
      mcpServers: { 'gemini-server': {} },
    })

    const result = scanRegisteredTools()
    const mcps = result.filter((t) => t.type === 'mcp' && t.scope === 'global')

    expect(mcps.find((t) => t.name === 'claude-server' && t.agentType === 'claude')).toBeDefined()
    expect(mcps.find((t) => t.name === 'codex-server' && t.agentType === 'codex')).toBeDefined()
    expect(mcps.find((t) => t.name === 'gemini-server' && t.agentType === 'gemini')).toBeDefined()
  })

  it('DB 에러 시 throw (catch하지 않음)', () => {
    testDb.close()
    expect(() => scanRegisteredTools()).toThrow()
  })
})
