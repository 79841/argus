import { execSync } from 'child_process'

export type ConfigChange = {
  date: string
  agent_type: string
  file_path: string
  commit_hash: string
  commit_message: string
  diff: string
}

const TRACKED_FILES: Record<string, string[]> = {
  codex: ['~/.codex/config.toml', '~/.codex/instructions.md', 'codex.md', 'AGENTS.md'],
  claude: [
    '~/.claude/settings.json',
    '.claude/settings.json',
    'CLAUDE.md',
    '.claude/agents/*.md',
    '.claude/skills/*/SKILL.md',
    '.mcp.json',
  ],
  gemini: ['~/.gemini/settings.json', 'GEMINI.md'],
}

const PROJECT_FILES = [
  'CLAUDE.md',
  'codex.md',
  'GEMINI.md',
  'AGENTS.md',
  '.claude/settings.json',
  '.claude/agents/',
  '.claude/skills/',
  '.mcp.json',
]

const detectAgentType = (filePath: string): string => {
  if (filePath.includes('claude') || filePath.includes('CLAUDE') || filePath.includes('.mcp')) {
    return 'claude'
  }
  if (filePath.includes('codex') || filePath.includes('AGENTS')) {
    return 'codex'
  }
  if (filePath.includes('gemini') || filePath.includes('GEMINI')) {
    return 'gemini'
  }
  return 'unknown'
}

export const getConfigHistory = async (
  repoPath: string,
  days: number = 30
): Promise<ConfigChange[]> => {
  const changes: ConfigChange[] = []

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)
  const since = sinceDate.toISOString().split('T')[0]

  for (const filePath of PROJECT_FILES) {
    try {
      const logOutput = execSync(
        `git log --since="${since}" --format="%H|%aI|%s" --follow -- "${filePath}"`,
        { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }
      ).trim()

      if (!logOutput) continue

      const lines = logOutput.split('\n')
      for (const line of lines) {
        const [hash, date, ...msgParts] = line.split('|')
        const message = msgParts.join('|')
        const agentType = detectAgentType(filePath)

        let diff = ''
        try {
          diff = execSync(`git diff ${hash}~1..${hash} -- "${filePath}"`, {
            cwd: repoPath,
            encoding: 'utf-8',
            timeout: 5000,
          }).trim()
        } catch {
          try {
            diff = execSync(`git show ${hash}:"${filePath}"`, {
              cwd: repoPath,
              encoding: 'utf-8',
              timeout: 5000,
            }).substring(0, 500)
          } catch {
            /* ignore */
          }
        }

        changes.push({
          date,
          agent_type: agentType,
          file_path: filePath,
          commit_hash: hash,
          commit_message: message,
          diff: diff.substring(0, 2000),
        })
      }
    } catch {
      // File not tracked or git error, skip
    }
  }

  return changes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export { TRACKED_FILES }
