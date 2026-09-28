import { isAbsolute, join } from 'node:path';
import { PROFILES_KEYS } from './constants';
import { parseIniGroups } from './parseIniGroups';

/** A Firefox profile: its name, and its folder. */
export interface FirefoxProfile {
  name: string;
  dir: string;
}

/** The profiles a `profiles.ini` in `dataDir` lists, each once: the installs' defaults first (the ones Firefox opens). */
export function profilesOf(dataDir: string, ini: string): FirefoxProfile[] {
  const groups = parseIniGroups(ini);
  const at = (path: string, relative: boolean) => (relative && !isAbsolute(path) ? join(dataDir, path) : path);
  const defaults = groups.filter((g) => g.name.startsWith(PROFILES_KEYS.installGroup) && g.keys[PROFILES_KEYS.installDefault]).map((g) => at(g.keys[PROFILES_KEYS.installDefault], true));
  const profiles = groups
    .filter((g) => g.name.startsWith(PROFILES_KEYS.profileGroup) && g.keys[PROFILES_KEYS.path])
    .map((g) => ({ name: g.keys[PROFILES_KEYS.name] ?? g.keys[PROFILES_KEYS.path], dir: at(g.keys[PROFILES_KEYS.path], g.keys[PROFILES_KEYS.relative] === PROFILES_KEYS.relativeYes) }));
  return profiles.sort((a, b) => Number(defaults.includes(b.dir)) - Number(defaults.includes(a.dir)));
}
