import fs from 'fs'
import os from 'os'
import path from 'path'

export type RegisteredToolType = 'agent' | 'skill' | 'mcp' | 'hook'
export type RegisteredToolScope = 'project' | 'global'

export type RegisteredTool = {
  name: string
  type: RegisteredToolType
  scope: RegisteredToolScope
  filePath: string
}

const tryReadJson = (filePath: string): Record<string, unknown> | null => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

const scanDirectory = (dirPath: string): string[] => {
  try {
    if (!fs.existsSync(dirPath)) return []
    return fs.readdirSync(dirPath)
  } catch {
    return []
  }
}

const scanAgents = (claudeDir: string, scope: RegisteredToolScope): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const agentsDir = path.join(claudeDir, 'agents')
  for (const file of scanDirectory(agentsDir)) {
    if (file.endsWith('.md')) {
      const filePath = path.join(agentsDir, file)
      tools.push({
        name: path.basename(file, '.md'),
        type: 'agent',
        scope,
        filePath,
      })
    }
  }
  return tools
}

const scanSkills = (claudeDir: string, scope: RegisteredToolScope): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const skillsDir = path.join(claudeDir, 'skills')
  for (const dir of scanDirectory(skillsDir)) {
    const skillFile = path.join(skillsDir, dir, 'SKILL.md')
    if (fs.existsSync(skillFile)) {
      tools.push({
        name: dir,
        type: 'skill',
        scope,
        filePath: skillFile,
      })
    }
  }
  return tools
}

const scanMcp = (rootDir: string, scope: RegisteredToolScope): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const mcpFile = scope === 'global'
    ? path.join(rootDir, '.claude', '.mcp.json')
    : path.join(rootDir, '.mcp.json')
  const mcpData = tryReadJson(mcpFile)
  if (mcpData && typeof mcpData === 'object') {
    const mcpServers = mcpData.mcpServers as Record<string, unknown> | undefined
    if (mcpServers) {
      for (const serverName of Object.keys(mcpServers)) {
        tools.push({
          name: serverName,
          type: 'mcp',
          scope,
          filePath: mcpFile,
        })
      }
    }
  }
  return tools
}

const scanHooks = (claudeDir: string, scope: RegisteredToolScope): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const settingsFile = path.join(claudeDir, 'settings.json')
  const data = tryReadJson(settingsFile)
  if (!data || typeof data !== 'object') return tools

  const hooks = data.hooks as Record<string, unknown[] | unknown> | undefined
  if (!hooks || typeof hooks !== 'object') return tools

  for (const [eventName, hookList] of Object.entries(hooks)) {
    if (!Array.isArray(hookList)) continue
    for (const hook of hookList) {
      const h = hook as Record<string, unknown>
      const matcher = (h.matcher as string) ?? '*'
      const command = (h.command as string) ?? ''
      const name = `${eventName}: ${matcher} -> ${command}`
      tools.push({
        name,
        type: 'hook',
        scope,
        filePath: settingsFile,
      })
    }
  }
  return tools
}

export const scanRegisteredTools = (): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const cwd = process.cwd()
  const home = os.homedir()

  // Project scope: .claude/agents, .claude/skills, .mcp.json, .claude/settings.json hooks
  const projectClaudeDir = path.join(cwd, '.claude')
  tools.push(...scanAgents(projectClaudeDir, 'project'))
  tools.push(...scanSkills(projectClaudeDir, 'project'))
  tools.push(...scanMcp(cwd, 'project'))
  tools.push(...scanHooks(projectClaudeDir, 'project'))

  // Global scope: ~/.claude/agents, ~/.claude/skills, ~/.claude/.mcp.json, ~/.claude/settings.json hooks
  if (home) {
    const globalClaudeDir = path.join(home, '.claude')
    tools.push(...scanAgents(globalClaudeDir, 'global'))
    tools.push(...scanSkills(globalClaudeDir, 'global'))
    tools.push(...scanMcp(home, 'global'))
    tools.push(...scanHooks(globalClaudeDir, 'global'))
  }

  // Deduplicate by name+type+scope
  const seen = new Set<string>()
  return tools.filter((t) => {
    const key = `${t.name}:${t.type}:${t.scope}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
