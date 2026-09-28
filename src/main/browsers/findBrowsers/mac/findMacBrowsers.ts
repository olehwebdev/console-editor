import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { BROWSER_ID_PREFIX } from '../../constants';
import { engineOf } from '../../engineOf';
import type { FoundBrowser } from '../../types';
import { APP_EXTENSION, MAC_APP_DIRS, OPEN_APP_FLAG, OPEN_COMMAND } from './constants';

/** The browsers in the Applications folders (for everyone first): apps whose name is a browser's the app knows. */
export async function findMacBrowsers(): Promise<FoundBrowser[]> {
  const found = new Map<string, FoundBrowser>();
  for (const dir of [MAC_APP_DIRS.system, join(homedir(), MAC_APP_DIRS.user)]) {
    for (const file of (await readdir(dir).catch((): string[] => [])).sort((a, b) => a.localeCompare(b))) {
      if (!file.endsWith(APP_EXTENSION)) continue;
      const name = file.slice(0, -APP_EXTENSION.length);
      const engine = engineOf([name]);
      if (engine === 'unknown' || found.has(name)) continue;
      const app = join(dir, file);
      const command = [OPEN_COMMAND, OPEN_APP_FLAG, app];
      found.set(name, { id: `${BROWSER_ID_PREFIX.mac}${name}`, name, engine, command, urlAt: command.length, iconFile: null, app, program: null, added: false });
    }
  }
  return [...found.values()];
}
