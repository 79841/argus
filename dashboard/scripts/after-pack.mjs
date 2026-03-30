import { execSync } from 'node:child_process'
import { existsSync, cpSync } from 'node:fs'
import { resolve, join } from 'node:path'

/** @param {import('electron-builder').AfterPackContext} context */
export default async function afterPack(context) {
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir)
  const unpackedDir = join(resourcesDir, 'app.asar.unpacked')

  if (!existsSync(unpackedDir)) return

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

  const result = execSync(`find "${unpackedDir}" -name "better_sqlite3.node" -type f`)
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)

  for (const target of result) {
    cpSync(rebuiltBinary, target)
    console.log(`[afterPack] Replaced ${target}`)
  }
}
