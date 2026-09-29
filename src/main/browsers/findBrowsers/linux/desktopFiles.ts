import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DESKTOP_ENTRY } from './constants';

/** How deep launchers are looked for below an applications folder (`kde4/konqueror.desktop` is one level down). */
const MAX_DEPTH = 2;

/** The launchers in an applications folder, as paths relative to it; none when it isn't there. */
export async function desktopFiles(dir: string, prefix = '', depth = 0): Promise<string[]> {
  const entries = await readdir(join(dir, prefix), { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory() && depth < MAX_DEPTH) files.push(...(await desktopFiles(dir, path, depth + 1)));
    else if (!entry.isDirectory() && entry.name.endsWith(DESKTOP_ENTRY.extension)) files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b));
}
