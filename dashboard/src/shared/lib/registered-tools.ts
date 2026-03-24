import fs from 'fs'
import os from 'os'
import path from 'path'
import { getDb } from './db'

export type RegisteredToolType = 'agent' | 'skill' | 'mcp' | 'hook'
export type RegisteredToolScope = 'project' | 'global'
export type RegisteredAgentType = 'claude' | 'codex' | 'gemini'

export type RegisteredTool = {
  name: string
  type: RegisteredToolType
  scope: RegisteredToolScope
  agentType: RegisteredAgentType
  projectName?: string
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
    return fs.readdirSync(dirPath)
  } catch {
    return []
  }
}

const scanAgents = (claudeDir: string, scope: RegisteredToolScope, agentType: RegisteredAgentType, projectName?: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const agentsDir = path.join(claudeDir, 'agents')
  for (const file of scanDirectory(agentsDir)) {
    if (file.endsWith('.md')) {
      const filePath = path.join(agentsDir, file)
      tools.push({
        name: path.basename(file, '.md'),
        type: 'agent',
        scope,
        agentType,
        projectName,
        filePath,
      })
    }
  }
  return tools
}

const scanSkills = (dir: string, scope: RegisteredToolScope, agentType: RegisteredAgentType, projectName?: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const skillsDir = path.join(dir, 'skills')
  for (const entry of scanDirectory(skillsDir)) {
    const skillFile = path.join(skillsDir, entry, 'SKILL.md')
    if (fs.existsSync(skillFile)) {
      tools.push({
        name: entry,
        type: 'skill',
        scope,
        agentType,
        projectName,
        filePath: skillFile,
      })
    }
  }
  return tools
}

const scanMcpFile = (mcpFile: string, scope: RegisteredToolScope, agentType: RegisteredAgentType, projectName?: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const mcpData = tryReadJson(mcpFile)
  if (mcpData && typeof mcpData === 'object') {
    const mcpServers = mcpData.mcpServers as Record<string, unknown> | undefined
    if (mcpServers) {
      for (const serverName of Object.keys(mcpServers)) {
        tools.push({
          name: serverName,
          type: 'mcp',
          scope,
          agentType,
          projectName,
          filePath: mcpFile,
        })
      }
    }
  }
  return tools
}

const scanMcp = (rootDir: string, scope: RegisteredToolScope, projectName?: string): RegisteredTool[] => {
  if (scope === 'global') {
    return [
      ...scanMcpFile(path.join(rootDir, '.claude', '.mcp.json'), scope, 'claude'),
      ...scanMcpFile(path.join(rootDir, '.codex', '.mcp.json'), scope, 'codex'),
    ]
  }
  return scanMcpFile(path.join(rootDir, '.mcp.json'), scope, 'claude', projectName)
}

const scanHooks = (claudeDir: string, scope: RegisteredToolScope, agentType: RegisteredAgentType, projectName?: string): RegisteredTool[] => {
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
        agentType,
        projectName,
        filePath: settingsFile,
      })
    }
  }
  return tools
}

const AGENT_CONFIG_DIRS: Record<RegisteredAgentType, string> = {
  claude: '.claude',
  codex: '.codex',
  gemini: '.gemini',
}

type RegisteredProject = { name: string; path: string }

const getRegisteredProjects = (): RegisteredProject[] => {
  const db = getDb()
  const rows = db.prepare('SELECT project_name, project_path FROM project_registry').all() as { project_name: string; project_path: string }[]
  return rows.map((r) => ({ name: r.project_name, path: r.project_path }))
}

const scanClaudeJsonMcp = (registeredProjects: RegisteredProject[]): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const claudeJsonPath = path.join(os.homedir(), '.claude.json')
  const data = tryReadJson(claudeJsonPath)
  if (!data) return tools

  const projects = data.projects as Record<string, Record<string, unknown>> | undefined
  if (!projects) return tools

  const registeredPathMap = new Map(registeredProjects.map((p) => [p.path, p.name]))

  for (const [projectPath, config] of Object.entries(projects)) {
    const projectName = registeredPathMap.get(projectPath)
    if (!projectName) continue

    const mcpServers = config.mcpServers as Record<string, unknown> | undefined
    if (!mcpServers) continue

    for (const serverName of Object.keys(mcpServers)) {
      tools.push({
        name: serverName,
        type: 'mcp',
        scope: 'project',
        agentType: 'claude',
        projectName,
        filePath: claudeJsonPath,
      })
    }
  }
  return tools
}

const scanProjectDir = (projectRoot: string, projectName: string, tools: RegisteredTool[]) => {
  for (const [agentType, configDir] of Object.entries(AGENT_CONFIG_DIRS) as [RegisteredAgentType, string][]) {
    const agentDir = path.join(projectRoot, configDir)
    tools.push(...scanAgents(agentDir, 'project', agentType, projectName))
    tools.push(...scanSkills(agentDir, 'project', agentType, projectName))
    tools.push(...scanHooks(agentDir, 'project', agentType, projectName))
  }
  tools.push(...scanMcp(projectRoot, 'project', projectName))
}

export const scanRegisteredTools = (): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const home = os.homedir()

  // Project scope — 연결된 프로젝트들만 (project_registry)
  const registeredProjects = getRegisteredProjects()
  for (const project of registeredProjects) {
    scanProjectDir(project.path, project.name, tools)
  }

  // Claude ~/.claude.json — 연결된 프로젝트의 MCP 서버
  tools.push(...scanClaudeJsonMcp(registeredProjects))

  // Global scope
  if (home) {
    for (const [agentType, configDir] of Object.entries(AGENT_CONFIG_DIRS) as [RegisteredAgentType, string][]) {
      const globalDir = path.join(home, configDir)
      tools.push(...scanAgents(globalDir, 'global', agentType))
      tools.push(...scanSkills(globalDir, 'global', agentType))
      tools.push(...scanHooks(globalDir, 'global', agentType))
    }
    tools.push(...scanMcp(home, 'global'))
  }

  // Deduplicate by name+type+scope+agentType
  const seen = new Set<string>()
  return tools.filter((t) => {
    const key = `${t.name}:${t.type}:${t.scope}:${t.agentType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
