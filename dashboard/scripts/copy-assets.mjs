import { cpSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const assetsSrc = resolve(root, 'electron', 'assets')
const assetsDest = resolve(root, 'dist-electron', 'electron', 'assets')
cpSync(assetsSrc, assetsDest, { recursive: true })

const standaloneRoot = resolve(root, '.next', 'standalone')
const distStandalone = resolve(root, 'dist-standalone')

/** Recursively find directories matching a predicate */
const findDirs = (dir, predicate, results = []) => {
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (predicate(full)) results.push(full)
      else findDirs(full, predicate, results)
    }
  }
  return results
}

if (existsSync(standaloneRoot)) {
  if (existsSync(distStandalone)) rmSync(distStandalone, { recursive: true })

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
    // Use Node.js cpSync with dereference to handle pnpm symlinks (cross-platform)
    cpSync(dashboardDir, distStandalone, { recursive: true, dereference: true })

    // Hoist peer deps (e.g. styled-jsx) that pnpm keeps in .pnpm/node_modules/
    const pnpmHoisted = join(distStandalone, 'node_modules', '.pnpm', 'node_modules')
    if (existsSync(pnpmHoisted)) {
      for (const entry of readdirSync(pnpmHoisted)) {
        const src = join(pnpmHoisted, entry)
        const dest = join(distStandalone, 'node_modules', entry)
        if (!existsSync(dest)) {
          cpSync(src, dest, { recursive: true, dereference: true })
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

    const electronBin = require.resolve('electron/cli.js')
    const electronVersion = execSync(`"${process.execPath}" "${electronBin}" --version`).toString().trim().replace('v', '')
    const arch = process.arch

    // Resolve prebuild-install from better-sqlite3's dependency tree (pnpm strict mode)
    const sqliteRequire = createRequire(require.resolve('better-sqlite3/package.json'))
    const prebuildBin = join(dirname(sqliteRequire.resolve('prebuild-install/package.json')), 'bin.js')

    const sqliteDirs = findDirs(distStandalone, (p) =>
      p.endsWith(join('better-sqlite3', 'build', 'Release')) && statSync(p).isDirectory()
    )
    for (const releaseDir of sqliteDirs) {
      const moduleDir = resolve(releaseDir, '..', '..')
      execSync(
        `"${process.execPath}" "${prebuildBin}" --runtime=electron --target=${electronVersion} --arch=${arch} --force`,
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
