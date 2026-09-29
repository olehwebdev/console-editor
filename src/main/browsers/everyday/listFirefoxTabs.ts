import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EverydayBrowser } from '../../../shared/types';
import { FIREFOX_DATA_DIRS, PROFILES_INI, SESSION_FILE } from './constants';
import { profilesOf } from './profilesOf';
import { readMozLz4 } from './readMozLz4';
import { sessionTabsOf } from './sessionTabsOf';

/** The browser name everyday Firefox tabs are listed under. */
const FIREFOX = 'Firefox';

/**
 * The tabs open in your everyday Firefox, profile by profile, as its session file has them (it is kept up to date while
 * Firefox runs, and holds the last session once it has quit). Profiles with none are left out.
 */
export async function listFirefoxTabs(home: string, platform: NodeJS.Platform): Promise<EverydayBrowser[]> {
  const found: EverydayBrowser[] = [];
  for (const dataDir of (FIREFOX_DATA_DIRS[platform] ?? []).map((dir) => join(home, dir))) {
    const ini = await readFile(join(dataDir, PROFILES_INI), 'utf8').catch(() => '');
    for (const profile of profilesOf(dataDir, ini)) {
      const tabs = sessionTabsOf((await readMozLz4(join(profile.dir, ...SESSION_FILE))) ?? '');
      if (tabs.length) found.push({ id: profile.dir, name: FIREFOX, profile: profile.name, tabs });
    }
  }
  return found;
}
