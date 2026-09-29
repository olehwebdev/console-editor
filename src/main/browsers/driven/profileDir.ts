import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import type { FoundBrowser } from '../types';
import { PROFILES_DIR, SANDBOX_DIRS, SANDBOXED_PROFILE } from './constants';

/**
 * Where a driven browser keeps its profile: in the app's data folder, or, for a Snap or a Flatpak, in the folder its
 * sandbox lets it write (and the app read).
 */
export function profileDir(browser: FoundBrowser, userData: string): string {
  const program = browser.program ?? '';
  if (program.startsWith(SANDBOX_DIRS.snapBin)) return join(homedir(), SANDBOX_DIRS.snap, basename(program), SANDBOX_DIRS.snapCommon, SANDBOXED_PROFILE);
  if (basename(program) === SANDBOX_DIRS.flatpak) {
    const run = browser.command.indexOf(SANDBOX_DIRS.flatpakRun);
    const appId = browser.command.slice(run + 1).find((arg) => !arg.startsWith('-'));
    if (run >= 0 && appId) return join(homedir(), SANDBOX_DIRS.flatpakData, appId, SANDBOX_DIRS.flatpakDataSub, SANDBOXED_PROFILE);
  }
  return join(userData, PROFILES_DIR, browser.id.replace(/[^a-z0-9._-]+/gi, '_'));
}
