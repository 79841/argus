import fs from 'fs'
import path from 'path'

export type RegisteredToolType = 'agent' | 'skill' | 'mcp'
export type RegisteredToolAgent = 'claude' | 'codex' | 'gemini'

export type RegisteredTool = {
  name: string
  type: RegisteredToolType
  agent: RegisteredToolAgent
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

const extractNameFromMd = (filePath: string): string => {
  const basename = path.basename(filePath, '.md')
  if (basename === 'SKILL') {
    return path.basename(path.dirname(filePath))
  }
  return basename
}

const scanDirectory = (dirPath: string): string[] => {
  try {
    if (!fs.existsSync(dirPath)) return []
    return fs.readdirSync(dirPath)
  } catch {
    return []
  }
}

const scanClaudeTools = (rootDir: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const claudeDir = path.join(rootDir, '.claude')

  // Agents: .claude/agents/*.md
  const agentsDir = path.join(claudeDir, 'agents')
  for (const file of scanDirectory(agentsDir)) {
    if (file.endsWith('.md')) {
      const filePath = path.join(agentsDir, file)
      tools.push({
        name: extractNameFromMd(filePath),
        type: 'agent',
        agent: 'claude',
        filePath,
      })
    }
  }

  // Skills: .claude/skills/*/SKILL.md
  const skillsDir = path.join(claudeDir, 'skills')
  for (const dir of scanDirectory(skillsDir)) {
    const skillFile = path.join(skillsDir, dir, 'SKILL.md')
    if (fs.existsSync(skillFile)) {
      tools.push({
        name: dir,
        type: 'skill',
        agent: 'claude',
        filePath: skillFile,
      })
    }
  }

  // MCP: .mcp.json
  const mcpFile = path.join(rootDir, '.mcp.json')
  const mcpData = tryReadJson(mcpFile)
  if (mcpData && typeof mcpData === 'object') {
    const mcpServers = (mcpData as Record<string, unknown>).mcpServers as Record<string, unknown> | undefined
    if (mcpServers) {
      for (const serverName of Object.keys(mcpServers)) {
        tools.push({
          name: serverName,
          type: 'mcp',
          agent: 'claude',
          filePath: mcpFile,
        })
      }
    }
  }

  return tools
}

const scanCodexTools = (rootDir: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const codexDir = path.join(rootDir, '.codex')

  if (!fs.existsSync(codexDir)) return tools

  for (const file of scanDirectory(codexDir)) {
    const filePath = path.join(codexDir, file)
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      tools.push({
        name: path.basename(file, path.extname(file)),
        type: 'agent',
        agent: 'codex',
        filePath,
      })
    }
  }

  return tools
}

const scanGeminiTools = (rootDir: string): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const geminiDir = path.join(rootDir, '.gemini')

  if (!fs.existsSync(geminiDir)) return tools

  for (const file of scanDirectory(geminiDir)) {
    const filePath = path.join(geminiDir, file)
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      tools.push({
        name: path.basename(file, path.extname(file)),
        type: 'agent',
        agent: 'gemini',
        filePath,
      })
    }
  }

  return tools
}

export const scanRegisteredTools = (): RegisteredTool[] => {
  const tools: RegisteredTool[] = []
  const cwd = process.cwd()
  const home = process.env.HOME || process.env.USERPROFILE || ''

  const dirs = [cwd]
  if (home && home !== cwd) {
    dirs.push(home)
  }

  for (const dir of dirs) {
    tools.push(...scanClaudeTools(dir))
    tools.push(...scanCodexTools(dir))
    tools.push(...scanGeminiTools(dir))
  }

  // Deduplicate by name+type+agent
  const seen = new Set<string>()
  return tools.filter((t) => {
    const key = `${t.name}:${t.type}:${t.agent}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
