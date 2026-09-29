import { basename, join } from 'node:path';
import { SANDBOX_DIRS } from '../constants';
import type { FoundBrowser } from '../../types';
import { EVERYDAY_PROFILES, PROFILES_ROOT, SANDBOXED_PROFILES } from './constants';

/**
 * The folder of a Chromium browser's everyday profile, by its name or program: in its system's usual place, or where
 * its Snap or Flatpak keeps it. Null for a browser (or system) the app doesn't know it for.
 */
export function everydayProfileDir(browser: FoundBrowser, home: string, platform: NodeJS.Platform = process.platform): string | null {
  const names = `${browser.name} ${browser.program ?? ''} ${browser.id}`;
  const profile = EVERYDAY_PROFILES.find((p) => p.pattern.test(names));
  const root = PROFILES_ROOT[platform];
  if (!profile || !root || !(platform in profile)) return null;
  const folder = profile[platform as keyof typeof profile] as string;
  const program = browser.program ?? '';
  if (program.startsWith(SANDBOX_DIRS.snapBin)) return join(home, SANDBOX_DIRS.snap, basename(program), SANDBOXED_PROFILES.snapCommon, folder);
  if (basename(program) === SANDBOX_DIRS.flatpak) {
    const appId = browser.command.slice(browser.command.indexOf(SANDBOX_DIRS.flatpakRun) + 1).find((arg) => !arg.startsWith('-'));
    if (appId) return join(home, SANDBOXED_PROFILES.flatpakData, appId, SANDBOXED_PROFILES.flatpakConfig, folder);
  }
  return join(home, root, folder);
}
