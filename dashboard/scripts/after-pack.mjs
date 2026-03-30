import { existsSync, cpSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

/** Recursively find files by name */
const findFiles = (dir, fileName, results = []) => {
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      findFiles(full, fileName, results)
    } else if (entry.name === fileName) {
      results.push(full)
    }
  }
  return results
}

/** @param {import('electron-builder').AfterPackContext} context */
export default async function afterPack(context) {
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir)
  const unpackedDir = join(resourcesDir, 'app.asar.unpacked')

  if (!existsSync(unpackedDir)) {
    console.warn('[afterPack] app.asar.unpacked not found, skipping')
    return
  }

  const rebuiltBinary = resolve(
    context.packager.projectDir,
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node',
  )

  if (!existsSync(rebuiltBinary)) {
    console.warn('[afterPack] Rebuilt better_sqlite3.node not found, skipping')
    return
  }

  const targets = findFiles(unpackedDir, 'better_sqlite3.node')

  if (targets.length === 0) {
    console.warn('[afterPack] No better_sqlite3.node found in unpacked dir')
    return
  }

  for (const target of targets) {
    cpSync(rebuiltBinary, target)
    console.log(`[afterPack] Replaced ${target}`)
  }
}
