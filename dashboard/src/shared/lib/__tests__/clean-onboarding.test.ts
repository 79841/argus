import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs module outside src
import { getElectronAppDataDir, cleanOnboarding, DB_FILES, APP_DATA_SUBDIRS } from '../../../../../scripts/clean-onboarding.mjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (obj: Record<string, string>) => obj as any

describe('getElectronAppDataDir', () => {
  it('returns AppData/Roaming/argus on Windows with APPDATA env', () => {
    const result = getElectronAppDataDir('win32', '/home/user', env({ APPDATA: 'C:\\Users\\user\\AppData\\Roaming' }));
    expect(result).toContain('argus');
    expect(result).toContain('AppData\\Roaming');
  });

  it('returns AppData/Roaming/argus on Windows without APPDATA env', () => {
    const result = getElectronAppDataDir('win32', '/home/user', env({}));
    expect(result).toContain('argus');
    expect(result).toContain('AppData');
  });

  it('returns Library/Application Support/argus on macOS', () => {
    const result = getElectronAppDataDir('darwin', '/Users/user', env({}));
    expect(result).toBe('/Users/user/Library/Application Support/argus');
  });

  it('returns XDG_CONFIG_HOME/argus on Linux with XDG_CONFIG_HOME set', () => {
    const result = getElectronAppDataDir('linux', '/home/user', env({ XDG_CONFIG_HOME: '/home/user/.config' }));
    expect(result).toBe('/home/user/.config/argus');
  });

  it('returns ~/.config/argus on Linux without XDG_CONFIG_HOME', () => {
    const result = getElectronAppDataDir('linux', '/home/user', env({}));
    expect(result).toBe('/home/user/.config/argus');
  });
});

describe('DB_FILES', () => {
  it('includes all three SQLite file extensions', () => {
    expect(DB_FILES).toHaveLength(3);
    expect(DB_FILES.some((f: string) => f.endsWith('.db'))).toBe(true);
    expect(DB_FILES.some((f: string) => f.endsWith('.db-wal'))).toBe(true);
    expect(DB_FILES.some((f: string) => f.endsWith('.db-shm'))).toBe(true);
  });
});

describe('APP_DATA_SUBDIRS', () => {
  it('includes Local Storage and Session Storage', () => {
    expect(APP_DATA_SUBDIRS).toContain('Local Storage');
    expect(APP_DATA_SUBDIRS).toContain('Session Storage');
  });
});

describe('cleanOnboarding', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `argus-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  it('removes existing DB files', () => {
    const dbFile = join(tmpDir, 'test.db');
    writeFileSync(dbFile, '');
    expect(existsSync(dbFile)).toBe(true);

    cleanOnboarding({ dbFiles: [dbFile], appDataDir: tmpDir, appDataSubdirs: [] });

    expect(existsSync(dbFile)).toBe(false);
  });

  it('removes app data subdirectories', () => {
    const subdir = join(tmpDir, 'Local Storage');
    mkdirSync(subdir, { recursive: true });
    writeFileSync(join(subdir, 'file.db'), '');
    expect(existsSync(subdir)).toBe(true);

    cleanOnboarding({ dbFiles: [], appDataDir: tmpDir, appDataSubdirs: ['Local Storage'] });

    expect(existsSync(subdir)).toBe(false);
  });

  it('does not throw when files do not exist', () => {
    expect(() =>
      cleanOnboarding({
        dbFiles: [join(tmpDir, 'nonexistent.db')],
        appDataDir: join(tmpDir, 'nonexistent'),
        appDataSubdirs: ['Local Storage'],
      })
    ).not.toThrow();
  });

  it('removes multiple DB files', () => {
    const files = ['a.db', 'b.db-wal', 'c.db-shm'].map((f) => join(tmpDir, f));
    for (const f of files) writeFileSync(f, '');

    cleanOnboarding({ dbFiles: files, appDataDir: tmpDir, appDataSubdirs: [] });

    for (const f of files) {
      expect(existsSync(f)).toBe(false);
    }
  });
});
