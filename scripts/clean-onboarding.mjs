#!/usr/bin/env node
/**
 * Cleans onboarding test artifacts: SQLite DB files and Electron app data.
 * Works on macOS, Windows, and Linux.
 */

import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

export const DB_FILES = [
  '../argus-onboarding-test.db',
  '../argus-onboarding-test.db-wal',
  '../argus-onboarding-test.db-shm',
];

export const APP_DATA_SUBDIRS = ['Local Storage', 'Session Storage'];

export function getElectronAppDataDir(os = platform(), home = homedir(), env = process.env) {
  if (os === 'win32') {
    return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'argus');
  }
  if (os === 'darwin') {
    return join(home, 'Library', 'Application Support', 'argus');
  }
  return join(env.XDG_CONFIG_HOME ?? join(home, '.config'), 'argus');
}

export function cleanOnboarding({ dbFiles = DB_FILES, appDataDir = getElectronAppDataDir(), appDataSubdirs = APP_DATA_SUBDIRS } = {}) {
  for (const file of dbFiles) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  for (const subdir of appDataSubdirs) {
    const target = join(appDataDir, subdir);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
  }
}

// Run when executed directly
const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  cleanOnboarding();
  console.log('Onboarding cleanup complete.');
}
