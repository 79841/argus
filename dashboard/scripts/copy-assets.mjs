import { cpSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const assetsSrc = resolve(root, 'electron', 'assets')
const assetsDest = resolve(root, 'dist-electron', 'electron', 'assets')
cpSync(assetsSrc, assetsDest, { recursive: true })

const standaloneRoot = resolve(root, '.next', 'standalone')
const distStandalone = resolve(root, 'dist-standalone')

if (existsSync(standaloneRoot)) {
  if (existsSync(distStandalone)) rmSync(distStandalone, { recursive: true })

  // Next.js standalone nests output under absolute workspace path
  const findDashboard = (dir) => {
    if (existsSync(join(dir, 'server.js'))) return dir
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const found = findDashboard(join(dir, entry.name))
        if (found) return found
      }
    }
    return null
  }

  const dashboardDir = findDashboard(standaloneRoot)
  if (dashboardDir) {
    // Dereference pnpm symlinks to create flat copies
    execSync(`cp -RLf "${dashboardDir}/" "${distStandalone}/"`)

    // Hoist peer deps (e.g. styled-jsx) that pnpm keeps in .pnpm/node_modules/
    const pnpmHoisted = join(distStandalone, 'node_modules', '.pnpm', 'node_modules')
    if (existsSync(pnpmHoisted)) {
      for (const entry of readdirSync(pnpmHoisted)) {
        const src = join(pnpmHoisted, entry)
        const dest = join(distStandalone, 'node_modules', entry)
        if (!existsSync(dest)) {
          execSync(`cp -RLf "${src}" "${dest}"`)
        }
      }
    }

    const pnpmDir = join(distStandalone, 'node_modules', '.pnpm')
    if (existsSync(pnpmDir)) rmSync(pnpmDir, { recursive: true })

    const staticSrc = resolve(root, '.next', 'static')
    const staticDest = resolve(distStandalone, '.next', 'static')
    if (existsSync(staticSrc)) {
      cpSync(staticSrc, staticDest, { recursive: true })
    }

    const publicSrc = resolve(root, 'public')
    const publicDest = resolve(distStandalone, 'public')
    if (existsSync(publicSrc)) {
      cpSync(publicSrc, publicDest, { recursive: true })
    }

    const electronVersion = execSync('npx electron --version').toString().trim().replace('v', '')
    const arch = process.arch
    const sqliteDirs = execSync(`find "${distStandalone}" -path "*/better-sqlite3/build/Release" -type d`)
      .toString().trim().split('\n').filter(Boolean)
    for (const releaseDir of sqliteDirs) {
      const moduleDir = resolve(releaseDir, '..', '..')
      execSync(
        `npx prebuild-install --runtime=electron --target=${electronVersion} --arch=${arch} --force`,
        { cwd: moduleDir, stdio: 'inherit' },
      )
    }

    for (const f of readdirSync(distStandalone)) {
      if (f.endsWith('.db') || f.endsWith('.db-shm') || f.endsWith('.db-wal')) {
        rmSync(join(distStandalone, f))
      }
    }
  }
}
