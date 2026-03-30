import fs from 'fs'
import path from 'path'
import os from 'os'

const MAX_PATH_LENGTH = 500

export const getUserHome = (): string => os.homedir()

export const normalizePath = (p: string): string =>
  process.platform === 'win32' ? p.replace(/\\/g, '/').toLowerCase() : p

export const resolveUserPath = (filePath: string): string =>
  path.join(getUserHome(), filePath.slice(2))

export const isPathSafe = (filePath: string, projectRoot?: string): boolean => {
  if (filePath.length > MAX_PATH_LENGTH) return false
  if (filePath.startsWith('~/')) {
    const absPath = resolveUserPath(filePath)
    let realPath: string
    try {
      realPath = fs.realpathSync(absPath)
    } catch {
      realPath = path.resolve(absPath)
    }
    const resolved = normalizePath(realPath)
    const home = normalizePath(getUserHome())
    return resolved.startsWith(home + '/') || resolved === home
  }
  if (!projectRoot) return false
  const normalizedRoot = normalizePath(path.resolve(projectRoot))
  const absPath = path.resolve(projectRoot, filePath)
  let realPath: string
  try {
    realPath = fs.realpathSync(absPath)
  } catch {
    realPath = absPath
  }
  const resolved = normalizePath(realPath)
  return resolved.startsWith(normalizedRoot + '/') || resolved === normalizedRoot
}

export const scanDirFiles = (
  dirPath: string,
  ext: string,
  agent: string,
  prefix: string
): Array<{ agent: string; path: string }> => {
  if (!fs.existsSync(dirPath)) return []
  try {
    return fs.readdirSync(dirPath)
      .filter((entry) => entry.endsWith(ext))
      .map((entry) => ({ agent, path: path.posix.join(prefix, entry) }))
  } catch {
    return []
  }
}

export const scanDynamicFiles = (root: string): Array<{ agent: string; path: string }> => [
  ...scanDirFiles(path.join(root, '.claude', 'rules'), '.md', 'claude', '.claude/rules'),
  ...scanDirFiles(path.join(root, '.codex', 'rules'), '.rules', 'codex', '.codex/rules'),
]

export type RegistryRow = { project_name: string; project_path: string }
